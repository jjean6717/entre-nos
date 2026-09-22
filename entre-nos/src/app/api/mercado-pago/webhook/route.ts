import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeHexEqual(a: string, b: string) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex')
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}
function cents(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : -1
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY
    if (!webhookSecret || !accessToken || !supabaseUrl || !supabaseSecret) {
      return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 })
    }

    const signature = request.headers.get('x-signature')
    const requestId = request.headers.get('x-request-id')
    const queryDataId = request.nextUrl.searchParams.get('data.id')
   if (!signature || !requestId || !queryDataId) {
  console.warn('MP_WEBHOOK_DIAG missing_signature_input', {
    hasSignature: Boolean(signature),
    hasRequestId: Boolean(requestId),
    hasQueryDataId: Boolean(queryDataId),
  })
  return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 401 })
}
    let ts = '', v1 = ''
    for (const part of signature.split(',')) {
      const [key, ...rest] = part.split('='); const value = rest.join('=').trim()
      if (key?.trim() === 'ts') ts = value
      if (key?.trim() === 'v1') v1 = value
    }
    if (!ts || !v1) {
  console.warn('MP_WEBHOOK_DIAG malformed_signature', {
    hasTs: Boolean(ts),
    hasV1: Boolean(v1),
  })
  return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
}

    const dataId = queryDataId.toLowerCase()
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex')
    if (!safeHexEqual(expected, v1)) {
  console.warn('MP_WEBHOOK_DIAG hmac_mismatch', {
    dataIdLength: dataId.length,
    requestIdLength: requestId.length,
    tsLength: ts.length,
    v1Length: v1.length,
  })
  return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
}

    const orderResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(queryDataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, cache: 'no-store',
    })
    const order = await orderResponse.json().catch(() => ({}))
    if (!orderResponse.ok) {
      console.error('Falha ao consultar Order', orderResponse.status, order)
      return NextResponse.json({ received: true, verified: true, processed: false }, { status: 200 })
    }

    if (order?.status !== 'processed' || order?.status_detail !== 'accredited') {
      return NextResponse.json({ received: true, verified: true, processed: false }, { status: 200 })
    }

    const externalReference = String(order?.external_reference || '')
    const match = /^pix_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(externalReference)
    if (!match) return NextResponse.json({ received: true, verified: true, processed: false }, { status: 200 })
    const paymentId = match[1]

    const admin = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: paymentRow, error: paymentError } = await admin.from('pix_payments')
      .select('id,user_id,subscription_id,amount_cents,status,provider,provider_order_id')
      .eq('id', paymentId).eq('provider', 'mercado_pago').maybeSingle()
    if (paymentError || !paymentRow) {
      console.error('PIX local não encontrado', paymentError)
      return NextResponse.json({ received: true, verified: true, processed: false }, { status: 200 })
    }

    if (paymentRow.status === 'paid') return NextResponse.json({ received: true, verified: true, processed: true }, { status: 200 })
    if (paymentRow.provider_order_id && paymentRow.provider_order_id !== String(order.id)) {
      console.error('Order divergente para PIX', paymentId)
      return NextResponse.json({ received: true, verified: true, processed: false }, { status: 200 })
    }
    if (cents(order?.total_amount) !== paymentRow.amount_cents || cents(order?.total_paid_amount) !== paymentRow.amount_cents) {
      console.error('Valor divergente para PIX', paymentId)
      return NextResponse.json({ received: true, verified: true, processed: false }, { status: 200 })
    }

    const providerPaymentId = order?.transactions?.payments?.[0]?.id ? String(order.transactions.payments[0].id) : null
    const { error: rpcError } = await admin.rpc('activate_pix_premium', {
      target_payment: paymentId,
      target_order_id: String(order.id),
      target_provider_payment_id: providerPaymentId,
    })
    if (rpcError) {
      console.error('Falha ao ativar Premium', rpcError)
      return NextResponse.json({ received: false }, { status: 500 })
    }
    return NextResponse.json({ received: true, verified: true, processed: true }, { status: 200 })
  } catch (error) {
    console.error('Erro no webhook do Mercado Pago', error)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'entre-nos-mercado-pago-webhook', signatureValidation: true })
}
