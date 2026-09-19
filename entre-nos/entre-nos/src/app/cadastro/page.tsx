'use client'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function isAdult(date: string) {
  if (!date) return false
  const birth = new Date(`${date}T12:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 18
}

export default function Page(){
 const router=useRouter(); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState('')
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); setMsg(''); const f=new FormData(e.currentTarget)
  const name=String(f.get('name')||'').trim(), birth=String(f.get('birth')||''), email=String(f.get('email')||'').trim(), password=String(f.get('password')||''), adult=f.get('adult')==='on'
  if(!name||!birth||!email||password.length<6){setMsg('Preencha todos os campos. A senha deve ter pelo menos 6 caracteres.');return}
  if(!adult||!isAdult(birth)){setMsg('O ENTRE NÓS é exclusivo para maiores de 18 anos.');return}
  setLoading(true)
  try{
   const supabase=createClient()
   const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}})
   if(error) throw error
   if(data.user){
    const {error:profileError}=await supabase.from('profiles').update({display_name:name,birth_date:birth,updated_at:new Date().toISOString()}).eq('id',data.user.id)
    if(profileError) throw profileError
   }
   if(data.session) router.push('/descobrir')
   else setMsg('Conta criada. Confira seu e-mail para confirmar o cadastro e depois faça login.')
  }catch(err){setMsg(err instanceof Error?err.message:'Não foi possível criar a conta.')}
  finally{setLoading(false)}
 }
 return <main className="center"><div className="panel"><div className="brand">ENTRE <b>NÓS</b></div><h1>Comece por aqui</h1><p>Crie sua conta para conhecer novas pessoas.</p><form onSubmit={submit}><label>Nome ou apelido<input name="name" required placeholder="Como quer ser chamado?"/></label><label>Data de nascimento<input name="birth" required type="date"/></label><label>E-mail<input name="email" required type="email" autoComplete="email" placeholder="voce@email.com"/></label><label>Senha<input name="password" required minLength={6} type="password" autoComplete="new-password" placeholder="Crie uma senha segura"/></label><label className="check"><input name="adult" type="checkbox" required/> Confirmo que tenho 18 anos ou mais.</label>{msg&&<div className="notice">{msg}</div>}<button className="btn primary" disabled={loading}>{loading?'Criando conta...':'Criar conta'}</button></form><p>Já tem conta? <Link href="/entrar">Entrar</Link></p></div></main>
}
