import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'crypto'
export const runtime = 'nodejs'
export async function POST() {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'Mercado Pago ainda não está habilitado neste ambiente.' }, { status: 503 })
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 })
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: 'online',
        total_amount: '27.90',
        external_reference: `premium_${user.id.replaceAll('-', '_')}_${Date.now()}`.slice(0,64),
        processing_mode: 'automatic',
        transactions: { payments: [{ amount: '27.90', payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
        payer: { email: user.email }
      }),
      cache: 'no-store'
    })
    const data = await response.json()
    if (!response.ok) {
      console.error('Mercado Pago error', response.status, data)
      return NextResponse.json({ error: 'Não foi possível gerar o PIX de teste.', detail: data?.message || data?.error || null }, { status: 502 })
    }
    const payment = data?.transactions?.payments?.[0]
    const method = payment?.payment_method || {}
    return NextResponse.json({
      orderId: data?.id, status: payment?.status || data?.status,
      statusDetail: payment?.status_detail || data?.status_detail,
      qrCode: method?.qr_code || null, qrCodeBase64: method?.qr_code_base64 || null,
      ticketUrl: method?.ticket_url || null, amount: '27.90', test: true
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno ao gerar o PIX.' }, { status: 500 })
  }
}
