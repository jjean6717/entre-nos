'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

type Perfil = {
  id:string
  display_name:string|null
  city:string|null
  state:string|null
  bio:string|null
  photo?:string
}

export default function Descobrir(){
  const s=createClient()
  const[perfis,setPerfis]=useState<Perfil[]>([])
  const[index,setIndex]=useState(0)
  const[msg,setMsg]=useState('Carregando perfis...')

  useEffect(()=>{carregar()},[])

  async function carregar(){
    const{data:{user}}=await s.auth.getUser()
    if(!user){location.href='/entrar';return}

    const{data:likes}=await s.from('likes').select('to_user').eq('from_user',user.id)
    const ignorar=new Set([user.id,...(likes||[]).map(x=>x.to_user)])

    const{data,error}=await s.from('profiles')
      .select('id,display_name,city,state,bio')
      .eq('is_suspended',false)
      .not('display_name','is',null)
      .limit(40)

    if(error){setMsg('Não foi possível carregar os perfis.');return}

    const candidatos=(data||[]).filter(p=>!ignorar.has(p.id))
    if(!candidatos.length){setPerfis([]);setMsg('Nenhum novo perfil disponível agora.');return}

    const ids=candidatos.map(p=>p.id)
    const{data:fotos}=await s.from('profile_photos')
      .select('user_id,storage_path')
      .in('user_id',ids)
      .eq('position',0)

    const mapa=new Map((fotos||[]).map(f=>[
      f.user_id,
      s.storage.from('profile-photos').getPublicUrl(f.storage_path).data.publicUrl
    ]))
    setPerfis(candidatos.map(p=>({...p,photo:mapa.get(p.id)||''})))
    setIndex(0)
    setMsg('')
  }

  function proximo(){
    if(index+1>=perfis.length){setIndex(perfis.length);setMsg('Você viu todos os perfis disponíveis por enquanto.')}
    else setIndex(index+1)
  }

  async function curtir(){
    const atual=perfis[index]
    if(!atual)return
    const{data:{user}}=await s.auth.getUser()
    if(!user)return
    setMsg('Enviando curtida...')
    const{error}=await s.from('likes').insert({from_user:user.id,to_user:atual.id})
    if(error && error.code!=='23505'){setMsg('Não foi possível enviar a curtida.');return}

    const{data:match}=await s.from('matches')
      .select('id')
      .or(`and(user_a.eq.${user.id},user_b.eq.${atual.id}),and(user_a.eq.${atual.id},user_b.eq.${user.id})`)
      .maybeSingle()

    if(match){setMsg(`É match com ${atual.display_name||'essa pessoa'}! ♥`);setTimeout(proximo,1300)}
    else {setMsg('Curtida enviada ♥');setTimeout(proximo,650)}
  }

  const p=perfis[index]
  return <main className="center"><section className="discover-shell">
    <div className="top"><span>ENTRE NÓS</span><Link href="/premium">PREMIUM</Link></div>
    <div className="discover-title"><h1>Descobrir</h1><p>Conheça novas pessoas e comece uma conversa.</p></div>
    {p?<div className="discover-card">
      <div className="discover-photo">{p.photo?<img src={p.photo} alt="Foto do perfil"/>:<span>♡</span>}</div>
      <div className="discover-info"><h2>{p.display_name||'Perfil'}</h2>
        {(p.city||p.state)&&<p className="location">{[p.city,p.state].filter(Boolean).join(' • ')}</p>}
        {p.bio&&<p className="bio">{p.bio}</p>}
      </div>
      <div className="discover-actions">
        <button className="round pass" onClick={proximo} aria-label="Passar">×</button>
        <button className="round love" onClick={curtir} aria-label="Curtir">♥</button>
      </div>
    </div>:<div className="empty-state"><span>♡</span><h2>Novas conexões em breve</h2><p>{msg||'Nenhum perfil disponível agora.'}</p></div>}
    {p&&msg&&<p className="discover-message">{msg}</p>}
    <nav className="appnav"><b>Descobrir</b><Link href="/curtidas">Curtidas</Link><Link href="/conversas">Conversas</Link><Link href="/perfil">Perfil</Link></nav>
  </section></main>
}
