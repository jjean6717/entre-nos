import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    console.log('Mercado Pago webhook recebido', {
      type: body?.type ?? body?.topic ?? null,
      action: body?.action ?? null,
      dataId: body?.data?.id ?? body?.id ?? null,
    })
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Erro no webhook do Mercado Pago', error)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'entre-nos-mercado-pago-webhook' })
}
