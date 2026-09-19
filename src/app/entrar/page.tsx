'use client'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function Page(){
 const router=useRouter(); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState('')
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); setMsg(''); setLoading(true); const f=new FormData(e.currentTarget)
  try{
   const supabase=createClient(); const {error}=await supabase.auth.signInWithPassword({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')})
   if(error) throw error
   router.push('/descobrir'); router.refresh()
  }catch(err){setMsg(err instanceof Error?err.message:'Não foi possível entrar.')}
  finally{setLoading(false)}
 }
 return <main className="center"><div className="panel"><div className="brand">ENTRE <b>NÓS</b></div><h1>Bem-vindo de volta</h1><p>Entre para continuar suas conversas.</p><form onSubmit={submit}><label>E-mail<input name="email" required type="email" autoComplete="email" placeholder="voce@email.com"/></label><label>Senha<input name="password" required type="password" autoComplete="current-password" placeholder="••••••••"/></label>{msg&&<div className="notice">{msg}</div>}<button className="btn primary" disabled={loading}>{loading?'Entrando...':'Entrar'}</button></form><p>Não tem conta? <Link href="/cadastro">Criar conta</Link></p></div></main>
}
