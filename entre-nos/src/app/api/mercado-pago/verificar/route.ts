import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cents(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : -1
}

export async function POST() {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const secret = process.env.SUPABASE_SECRET_KEY
    if (!token || !url || !publishable || !secret) {
      return NextResponse.json({ error: 'Verificação temporariamente indisponível.' }, { status: 503 })
    }

    const cookieStore = await cookies()
    const auth = createServerClient(url, publishable, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(items) { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    })
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 })

    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: payment, error: paymentError } = await admin.from('pix_payments')
      .select('id,user_id,subscription_id,amount_cents,status,provider,provider_order_id,created_at')
      .eq('user_id', user.id)
      .eq('provider', 'mercado_pago')
      .in('status', ['pending', 'paid'])
      .not('provider_order_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError) throw paymentError
    if (!payment) return NextResponse.json({ error: 'Nenhum PIX encontrado para verificar.' }, { status: 404 })
    if (payment.status === 'paid') return NextResponse.json({ paid: true, message: 'Premium já está ativo.' })

    const orderResponse = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(String(payment.provider_order_id))}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' }
    )
    const order = await orderResponse.json().catch(() => ({}))
    if (!orderResponse.ok) {
      console.error('Falha ao verificar Order', orderResponse.status)
      return NextResponse.json({ error: 'Não foi possível verificar o pagamento agora.' }, { status: 502 })
    }

    if (String(order?.id) !== String(payment.provider_order_id)) {
      return NextResponse.json({ error: 'Pagamento não corresponde à cobrança registrada.' }, { status: 409 })
    }
    if (String(order?.external_reference || '') !== `pix_${payment.id}`) {
      return NextResponse.json({ error: 'Referência do pagamento não confere.' }, { status: 409 })
    }
    if (cents(order?.total_amount) !== payment.amount_cents || cents(order?.total_paid_amount) !== payment.amount_cents) {
      return NextResponse.json({ error: 'Valor do pagamento não confere.' }, { status: 409 })
    }
    if (order?.status !== 'processed' || order?.status_detail !== 'accredited') {
      return NextResponse.json({ paid: false, message: 'Pagamento ainda não confirmado pelo Mercado Pago.' })
    }

    const providerPaymentId = order?.transactions?.payments?.[0]?.id ? String(order.transactions.payments[0].id) : null
    const { error: rpcError } = await admin.rpc('activate_pix_premium', {
      target_payment: payment.id,
      target_order_id: String(order.id),
      target_provider_payment_id: providerPaymentId,
    })
    if (rpcError) {
      console.error('Falha ao ativar Premium', rpcError)
      return NextResponse.json({ error: 'Pagamento confirmado, mas não foi possível ativar o Premium.' }, { status: 500 })
    }

    return NextResponse.json({ paid: true, message: 'Pagamento confirmado. Premium ativado!' })
  } catch (error) {
    console.error('Erro ao verificar PIX', error)
    return NextResponse.json({ error: 'Erro interno ao verificar o pagamento.' }, { status: 500 })
  }
}
