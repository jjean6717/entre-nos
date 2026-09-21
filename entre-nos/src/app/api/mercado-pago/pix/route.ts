import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function money(cents: number) { return (cents / 100).toFixed(2) }

export async function POST() {
  let paymentId: string | null = null
  let pendingSubscriptionId: string | null = null
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const secret = process.env.SUPABASE_SECRET_KEY
    if (!token || !url || !publishable || !secret) {
      return NextResponse.json({ error: 'Pagamento temporariamente indisponível.' }, { status: 503 })
    }

    const cookieStore = await cookies()
    const auth = createServerClient(url, publishable, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(items) { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    })
    const { data: { user } } = await auth.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 })

    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: plan, error: planError } = await admin.from('plans')
      .select('id,name,price_cents,regular_price_cents,duration_days,active')
      .eq('active', true).order('price_cents', { ascending: true }).limit(1).maybeSingle()
    if (planError || !plan || plan.price_cents < 100) {
      console.error('Plano Premium indisponível', planError)
      return NextResponse.json({ error: 'Plano Premium indisponível.' }, { status: 503 })
    }

    const { data: pendingSub, error: subError } = await admin.from('subscriptions')
      .insert({ user_id: user.id, plan_id: plan.id, status: 'pending' })
      .select('id').single()
    if (subError || !pendingSub) throw subError || new Error('Falha ao criar assinatura pendente')
    pendingSubscriptionId = pendingSub.id

    const { data: paymentRow, error: paymentError } = await admin.from('pix_payments')
      .insert({ user_id: user.id, subscription_id: pendingSub.id, amount_cents: plan.price_cents, provider: 'mercado_pago', status: 'pending' })
      .select('id').single()
    if (paymentError || !paymentRow) throw paymentError || new Error('Falha ao registrar PIX')
    paymentId = paymentRow.id

    const amount = money(plan.price_cents)
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': paymentRow.id,
      },
      body: JSON.stringify({
        type: 'online', total_amount: amount,
        external_reference: `pix_${paymentRow.id}`,
        processing_mode: 'automatic',
        transactions: { payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
        payer: { email: user.email },
      }),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.id) {
      console.error('Mercado Pago create order error', response.status, data)
      await admin.from('pix_payments').update({ status: 'failed' }).eq('id', paymentRow.id)
      await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', pendingSub.id)
      return NextResponse.json({ error: 'Não foi possível gerar o PIX. Tente novamente.' }, { status: 502 })
    }

    const payment = data?.transactions?.payments?.[0]
    const method = payment?.payment_method || {}
    const providerPaymentId = payment?.id ? String(payment.id) : null
    const { error: updateError } = await admin.from('pix_payments').update({
      provider_order_id: String(data.id), provider_payment_id: providerPaymentId, qr_code_text: method?.qr_code || null,
    }).eq('id', paymentRow.id)
    if (updateError) console.error('Falha ao salvar dados da order', updateError)

    return NextResponse.json({
      orderId: String(data.id), status: payment?.status || data?.status,
      statusDetail: payment?.status_detail || data?.status_detail,
      qrCode: method?.qr_code || null, qrCodeBase64: method?.qr_code_base64 || null,
      ticketUrl: method?.ticket_url || null, amount, durationDays: plan.duration_days,
      planName: plan.name, regularAmount: plan.regular_price_cents ? money(plan.regular_price_cents) : null,
    })
  } catch (error) {
    console.error('Erro interno ao gerar PIX', error)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY
      if (url && secret) {
        const admin = createClient(url, secret, { auth: { persistSession: false } })
        if (paymentId) await admin.from('pix_payments').update({ status: 'failed' }).eq('id', paymentId)
        if (pendingSubscriptionId) await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', pendingSubscriptionId)
      }
    } catch {}
    return NextResponse.json({ error: 'Erro interno ao gerar o PIX.' }, { status: 500 })
  }
}
