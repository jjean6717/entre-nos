'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

type Item={id:string;display_name:string|null;city:string|null;state:string|null;photo?:string}

export default function Curtidas(){
 const s=createClient()
 const[itens,setItens]=useState<Item[]>([])
 const[msg,setMsg]=useState('Carregando...')
 useEffect(()=>{(async()=>{
   const{data:{user}}=await s.auth.getUser();if(!user){location.href='/entrar';return}
   const{data:recebidas}=await s.from('likes').select('from_user').eq('to_user',user.id)
   const ids=[...new Set((recebidas||[]).map(x=>x.from_user))]
   if(!ids.length){setMsg('Quando alguém curtir você, aparecerá aqui.');return}
   const{data:p}=await s.from('profiles').select('id,display_name,city,state').in('id',ids).eq('is_suspended',false)
   const{data:f}=await s.from('profile_photos').select('user_id,storage_path').in('user_id',ids).eq('position',0)
   const fm=new Map((f||[]).map(x=>[x.user_id,s.storage.from('profile-photos').getPublicUrl(x.storage_path).data.publicUrl]))
   setItens((p||[]).map(x=>({...x,photo:fm.get(x.id)||''})));setMsg('')
 })()},[])
 return <main className="center"><section className="likes-shell"><div className="top"><Link href="/descobrir">ENTRE NÓS</Link><Link href="/premium">PREMIUM</Link></div><h1>Curtidas</h1><p className="likes-intro">Pessoas que demonstraram interesse em você.</p>
 {itens.length?<div className="likes-grid">{itens.map(p=><div className="like-card" key={p.id}>{p.photo?<img src={p.photo} alt="Foto do perfil"/>:<div className="like-placeholder">♡</div>}<div><strong>{p.display_name||'Perfil'}</strong><small>{[p.city,p.state].filter(Boolean).join(' • ')}</small></div></div>)}</div>:<div className="empty-state compact"><span>♡</span><p>{msg}</p></div>}
 <nav className="appnav"><Link href="/descobrir">Descobrir</Link><b>Curtidas</b><Link href="/conversas">Conversas</Link><Link href="/perfil">Perfil</Link></nav></section></main>
}
