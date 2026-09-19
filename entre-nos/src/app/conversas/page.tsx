'use client'
import Link from 'next/link'
import { useEffect,useState } from 'react'
import { createClient } from '../../lib/supabase'
type Match={id:string;otherId:string;name:string;photo?:string}
export default function Conversas(){
 const s=createClient();const[itens,setItens]=useState<Match[]>([]);const[msg,setMsg]=useState('Carregando conversas...')
 useEffect(()=>{(async()=>{const{data:{user}}=await s.auth.getUser();if(!user){location.href='/entrar';return}
 const{data:m,error}=await s.from('matches').select('id,user_a,user_b').or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
 if(error){setMsg('Não foi possível carregar seus matches.');return}
 const base=(m||[]).map(x=>({id:x.id,otherId:x.user_a===user.id?x.user_b:x.user_a}))
 if(!base.length){setMsg('Quando houver um Match, ele aparecerá aqui.');return}
 const ids=base.map(x=>x.otherId);const[{data:p},{data:f}]=await Promise.all([s.from('profiles').select('id,display_name').in('id',ids),s.from('profile_photos').select('user_id,storage_path').in('user_id',ids).eq('position',0)])
 const pm=new Map((p||[]).map(x=>[x.id,x.display_name||'Match']));const fm=new Map((f||[]).map(x=>[x.user_id,s.storage.from('profile-photos').getPublicUrl(x.storage_path).data.publicUrl]))
 setItens(base.map(x=>({...x,name:pm.get(x.otherId)||'Match',photo:fm.get(x.otherId)||''})));setMsg('')})()},[])
 return <main className="center"><section className="likes-shell"><div className="top"><Link href="/descobrir">ENTRE NÓS</Link><Link href="/premium">PREMIUM</Link></div><h1>Conversas</h1><p className="likes-intro">Seus Matches aparecem aqui.</p>
 {itens.length?<div style={{display:'grid',gap:12,marginTop:24}}>{itens.map(x=><Link href={`/conversas/${x.id}`} key={x.id} style={{display:'flex',alignItems:'center',gap:14,padding:14,border:'1px solid #4f2b35',borderRadius:16,background:'#0d090a'}}>{x.photo?<img src={x.photo} alt="" style={{width:58,height:58,borderRadius:'50%',objectFit:'cover'}}/>:<div style={{width:58,height:58,borderRadius:'50%',display:'grid',placeItems:'center',background:'#291019',fontSize:28}}>♡</div>}<div><strong style={{display:'block'}}>{x.name}</strong><small style={{display:'block',color:'#dda7b4',marginTop:5}}>Match ♥ · Abrir conversa</small></div></Link>)}</div>:<div className="empty-state compact"><span>♡</span><p>{msg}</p></div>}
 <nav className="appnav"><Link href="/descobrir">Descobrir</Link><Link href="/curtidas">Curtidas</Link><b>Conversas</b><Link href="/perfil">Perfil</Link></nav></section></main>
}