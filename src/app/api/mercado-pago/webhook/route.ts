import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
export const runtime='nodejs'
export const dynamic='force-dynamic'
function eq(a:string,b:string){if(!/^[0-9a-f]+$/i.test(a)||! /^[0-9a-f]+$/i.test(b))return false;const x=Buffer.from(a,'hex'),y=Buffer.from(b,'hex');return x.length===y.length&&crypto.timingSafeEqual(x,y)}
export async function POST(request:NextRequest){
 try{
  const secret=process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if(!secret)return NextResponse.json({error:'Webhook não configurado.'},{status:503})
  const sig=request.headers.get('x-signature'),rid=request.headers.get('x-request-id'),raw=request.nextUrl.searchParams.get('data.id')
  if(!sig||!rid||!raw)return NextResponse.json({error:'Assinatura ausente.'},{status:401})
  let ts='',v1=''
  for(const part of sig.split(',')){const [k,...r]=part.split('=');const v=r.join('=').trim();if(k?.trim()==='ts')ts=v;if(k?.trim()==='v1')v1=v}
  if(!ts||!v1)return NextResponse.json({error:'Assinatura inválida.'},{status:401})
  const dataId=raw.toLowerCase()
  const manifest=`id:${dataId};request-id:${rid};ts:${ts};`
  const expected=crypto.createHmac('sha256',secret).update(manifest).digest('hex')
  if(!eq(expected,v1))return NextResponse.json({error:'Assinatura inválida.'},{status:401})
  const body=await request.json().catch(()=>null)
  console.log('Mercado Pago webhook autenticado',{type:body?.type??request.nextUrl.searchParams.get('type')??null,action:body?.action??null,dataId})
  return NextResponse.json({received:true},{status:200})
 }catch(e){console.error('Erro no webhook do Mercado Pago',e);return NextResponse.json({received:false},{status:500})}
}
export async function GET(){return NextResponse.json({ok:true,service:'entre-nos-mercado-pago-webhook',signatureValidation:true})}
