'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
type Item={id:string;display_name:string|null;city:string|null;state:string|null;photo?:string;matched?:boolean}
export default function Curtidas(){
 const s=createClient();const[itens,setItens]=useState<Item[]>([]);const[msg,setMsg]=useState('Carregando...')
 useEffect(()=>{carregar()},[])
 async function carregar(){
  const{data:{user}}=await s.auth.getUser();if(!user){location.href='/entrar';return}
  const{data:r}=await s.from('likes').select('from_user').eq('to_user',user.id);const ids=[...new Set((r||[]).map(x=>x.from_user))]
  if(!ids.length){setItens([]);setMsg('Quando alguém curtir você, aparecerá aqui.');return}
  const[{data:p},{data:f},{data:m}]=await Promise.all([
   s.from('profiles').select('id,display_name,city,state').in('id',ids).eq('is_suspended',false),
   s.from('profile_photos').select('user_id,storage_path').in('user_id',ids).eq('position',0),
   s.from('matches').select('user_a,user_b').or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
  ])
  const fm=new Map((f||[]).map(x=>[x.user_id,s.storage.from('profile-photos').getPublicUrl(x.storage_path).data.publicUrl]))
  const mm=new Set((m||[]).map(x=>x.user_a===user.id?x.user_b:x.user_a))
  setItens((p||[]).map(x=>({...x,photo:fm.get(x.id)||'',matched:mm.has(x.id)})));setMsg('')
 }
 async function curtir(id:string,nome:string){
  const{data:{user}}=await s.auth.getUser();if(!user)return
  setMsg('Criando conexão...')
  const{error}=await s.from('likes').insert({from_user:user.id,to_user:id})
  if(error&&error.code!=='23505'){setMsg('Não foi possível curtir agora.');return}
  await new Promise(r=>setTimeout(r,250))
  const{data:match}=await s.from('matches').select('id').or(`and(user_a.eq.${user.id},user_b.eq.${id}),and(user_a.eq.${id},user_b.eq.${user.id})`).maybeSingle()
  if(match){setMsg(`É Match com ${nome}! ♥ Agora vocês podem conversar.`);setItens(v=>v.map(x=>x.id===id?{...x,matched:true}:x))}
  else setMsg('Curtida enviada ♥')
 }
 return <main className="center"><section className="likes-shell"><div className="top"><Link href="/descobrir">ENTRE NÓS</Link><Link href="/premium">PREMIUM</Link></div><h1>Curtidas</h1><p className="likes-intro">Pessoas que demonstraram interesse em você.</p>
 {msg&&<p className="discover-message">{msg}</p>}
 {itens.length?<div className="likes-grid">{itens.map(p=><div className="like-card" key={p.id}>{p.photo?<img src={p.photo} alt="Foto do perfil"/>:<div className="like-placeholder">♡</div>}<div><strong>{p.display_name||'Perfil'}</strong><small>{[p.city,p.state].filter(Boolean).join(' • ')}</small>{p.matched?<Link className="match-button" href="/conversas">Conversar ♥</Link>:<button className="match-button" onClick={()=>curtir(p.id,p.display_name||'essa pessoa')}>♥ Curtir de volta</button>}</div></div>)}</div>:<div className="empty-state compact"><span>♡</span><p>{msg}</p></div>}
 <nav className="appnav"><Link href="/descobrir">Descobrir</Link><b>Curtidas</b><Link href="/conversas">Conversas</Link><Link href="/perfil">Perfil</Link></nav></section></main>
}