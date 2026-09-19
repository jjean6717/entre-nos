'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
type Match={id:string;otherId:string;name:string;photo?:string}
export default function Conversas(){
 const s=createClient();const[itens,setItens]=useState<Match[]>([]);const[msg,setMsg]=useState('Carregando conversas...')
 useEffect(()=>{(async()=>{
  const{data:{user}}=await s.auth.getUser();if(!user){location.href='/entrar';return}
  const{data:m,error}=await s.from('matches').select('id,user_a,user_b').or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
  if(error){setMsg('Não foi possível carregar seus matches.');return}
  const base=(m||[]).map(x=>({id:x.id,otherId:x.user_a===user.id?x.user_b:x.user_a}))
  if(!base.length){setMsg('Quando houver um Match, ele aparecerá aqui.');return}
  const ids=base.map(x=>x.otherId)
  const[{data:p},{data:f}]=await Promise.all([s.from('profiles').select('id,display_name').in('id',ids),s.from('profile_photos').select('user_id,storage_path').in('user_id',ids).eq('position',0)])
  const pm=new Map((p||[]).map(x=>[x.id,x.display_name||'Match']));const fm=new Map((f||[]).map(x=>[x.user_id,s.storage.from('profile-photos').getPublicUrl(x.storage_path).data.publicUrl]))
  setItens(base.map(x=>({...x,name:pm.get(x.otherId)||'Match',photo:fm.get(x.otherId)||''})));setMsg('')
 })()},[])
 return <main className="center"><section className="likes-shell"><div className="top"><Link href="/descobrir">ENTRE NÓS</Link><Link href="/premium">PREMIUM</Link></div><h1>Conversas</h1><p className="likes-intro">Seus Matches aparecem aqui.</p>
 {itens.length?<div className="conversation-list">{itens.map(x=><div className="conversation-item" key={x.id}>{x.photo?<img src={x.photo} alt="Foto do match"/>:<div className="conversation-avatar">♡</div>}<div><strong>{x.name}</strong><small>Match ♥</small></div><span>Conversa liberada</span></div>)}</div>:<div className="empty-state compact"><span>♡</span><p>{msg}</p></div>}
 <nav className="appnav"><Link href="/descobrir">Descobrir</Link><Link href="/curtidas">Curtidas</Link><b>Conversas</b><Link href="/perfil">Perfil</Link></nav></section></main>
}