import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
export const dynamic='force-dynamic'
export async function GET(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY
 if(!url||!key||!secret)return NextResponse.json({error:'Configuração indisponível.'},{status:503})
 const cs=await cookies()
 const auth=createServerClient(url,key,{cookies:{getAll(){return cs.getAll()},setAll(items){try{items.forEach(({name,value,options})=>cs.set(name,value,options))}catch{}}}})
 const {data:{user}}=await auth.auth.getUser()
 if(!user)return NextResponse.json({error:'Faça login para continuar.'},{status:401})
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await admin.from('subscriptions').select('status,ends_at,plans(name)').eq('user_id',user.id).eq('status','active').gt('ends_at',new Date().toISOString()).order('ends_at',{ascending:false}).limit(1).maybeSingle()
 if(error)return NextResponse.json({error:'Não foi possível consultar a assinatura.'},{status:500})
 const plan=Array.isArray(data?.plans)?data?.plans?.[0]:data?.plans
 return NextResponse.json({active:!!data,endsAt:data?.ends_at||null,planName:(plan as any)?.name||null})
}