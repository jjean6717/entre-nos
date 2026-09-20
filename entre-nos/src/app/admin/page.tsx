'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {createClient} from '../../lib/supabase'

export default function Admin(){
 const s=createClient(),[ok,setOk]=useState<boolean|null>(null),[users,setUsers]=useState<any[]>([]),[reports,setReports]=useState<any[]>([]),[msg,setMsg]=useState('Carregando painel...')
 async function load(){
  const{data:{user}}=await s.auth.getUser(); if(!user){location.href='/entrar';return}
  const{data:adm}=await s.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle()
  if(!adm){setOk(false);setMsg('Acesso restrito a administradores.');return}
  setOk(true)
  const[{data:u,error:ue},{data:r,error:re}]=await Promise.all([
   s.from('profiles').select('id,display_name,city,state,is_verified,is_suspended,created_at').order('created_at',{ascending:false}),
   s.from('reports').select('id,reporter_id,reported_id,reason,details,status,created_at').order('created_at',{ascending:false})
  ])
  if(ue||re){setMsg('Não foi possível carregar todos os dados do painel.');return}
  setUsers(u||[]);setReports(r||[]);setMsg('')
 }
 useEffect(()=>{load()},[])
 async function suspend(id:string,value:boolean){if(!confirm(value?'Suspender este usuário?':'Reativar este usuário?'))return;const{error}=await s.rpc('admin_set_suspended',{target_user:id,suspended:value});if(error){alert('Não foi possível concluir a ação.');return}setUsers(v=>v.map(x=>x.id===id?{...x,is_suspended:value}:x))}
 async function status(id:string,value:string){const{error}=await s.rpc('admin_set_report_status',{target_report:id,new_status:value});if(error){alert('Não foi possível atualizar a denúncia.');return}setReports(v=>v.map(x=>x.id===id?{...x,status:value}:x))}
 const name=(id:string)=>users.find(x=>x.id===id)?.display_name||'Usuário'
 if(ok===false)return <main className="center"><section className="likes-shell"><h1>Painel administrativo</h1><p className="notice">{msg}</p><Link className="btn" href="/perfil">Voltar ao perfil</Link></section></main>
 return <main className="center"><section className="profile-editor" style={{width:'min(1000px,100%)'}}><div className="top"><Link href="/perfil">← PERFIL</Link><span>ADMIN • ENTRE NÓS</span></div><h1 style={{marginTop:28}}>Painel administrativo</h1><p>Gerencie denúncias e contas com segurança.</p>{msg&&<p className="notice">{msg}</p>}
 {ok&&<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'24px 0'}}><div className="notice"><b>{users.length}</b><br/>Usuários</div><div className="notice"><b>{reports.filter(x=>x.status==='open').length}</b><br/>Denúncias abertas</div><div className="notice"><b>{users.filter(x=>x.is_suspended).length}</b><br/>Suspensos</div></div>
 <h2>Denúncias</h2><div style={{display:'grid',gap:12}}>{reports.length?reports.map(r=><article key={r.id} style={{border:'1px solid #4f2b35',borderRadius:16,padding:16}}><b>{name(r.reported_id)}</b><p style={{color:'#e7c9c9'}}>{r.reason}{r.details?` — ${r.details}`:''}</p><small>Status: {r.status}</small><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button className="btn" onClick={()=>status(r.id,'reviewing')}>Em análise</button><button className="btn" onClick={()=>status(r.id,'resolved')}>Resolver</button><button className="btn" onClick={()=>status(r.id,'dismissed')}>Descartar</button></div></article>):<p className="notice">Nenhuma denúncia recebida.</p>}</div>
 <h2 style={{marginTop:30}}>Usuários</h2><div style={{display:'grid',gap:10}}>{users.map(u=><div key={u.id} style={{border:'1px solid #4f2b35',borderRadius:16,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap'}}><div><b>{u.display_name||'Usuário'}</b><small style={{display:'block',color:'#b7a8ac',marginTop:5}}>{[u.city,u.state].filter(Boolean).join(' • ')||'Local não informado'} {u.is_suspended?'• SUSPENSO':''}</small></div><button className={u.is_suspended?'btn':'btn primary'} onClick={()=>suspend(u.id,!u.is_suspended)}>{u.is_suspended?'Reativar':'Suspender'}</button></div>)}</div></>}
 </section></main>
}