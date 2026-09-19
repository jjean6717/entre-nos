'use client'
import Link from 'next/link'
import { FormEvent,useEffect,useRef,useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
type Msg={id:string;sender_id:string;body:string;created_at:string;read_at:string|null}
export default function Chat(){
 const s=createClient(),params=useParams(),matchId=String(params.id)
 const[userId,setUserId]=useState(''),[name,setName]=useState('Match'),[msgs,setMsgs]=useState<Msg[]>([]),[body,setBody]=useState(''),[status,setStatus]=useState('Carregando...')
 const end=useRef<HTMLDivElement>(null)
 useEffect(()=>{let timer:any;(async()=>{const{data:{user}}=await s.auth.getUser();if(!user){location.href='/entrar';return}setUserId(user.id)
 const{data:m,error}=await s.from('matches').select('user_a,user_b').eq('id',matchId).single();if(error||!m){setStatus('Conversa não encontrada.');return}
 const other=m.user_a===user.id?m.user_b:m.user_a;const{data:p}=await s.from('profiles').select('display_name').eq('id',other).single();setName(p?.display_name||'Match')
 await carregar(user.id);timer=setInterval(()=>carregar(user.id),1800)})();return()=>clearInterval(timer)},[matchId])
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'})},[msgs])
 async function carregar(uid:string){const{data,error}=await s.from('messages').select('id,sender_id,body,created_at,read_at').eq('match_id',matchId).order('created_at',{ascending:true});if(!error){setMsgs(data||[]);setStatus('');const unread=(data||[]).filter(x=>x.sender_id!==uid&&!x.read_at).map(x=>x.id);if(unread.length)await s.from('messages').update({read_at:new Date().toISOString()}).in('id',unread)}}
 async function enviar(e:FormEvent){e.preventDefault();const text=body.trim();if(!text||!userId)return;setBody('');const{error}=await s.from('messages').insert({match_id:matchId,sender_id:userId,body:text});if(error){setStatus('Não foi possível enviar a mensagem.');setBody(text);return}await carregar(userId)}
 const hora=(d:string)=>new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(d))
 return <main className="center"><section style={{width:'min(620px,100%)',padding:24,border:'1px solid #4b2731',borderRadius:28,background:'#110c0ee8'}}>
 <div className="top"><Link href="/conversas">← CONVERSAS</Link><span>ENTRE NÓS</span></div><div style={{margin:'24px 0 16px'}}><h1 style={{font:'500 34px Georgia,serif',margin:0}}>{name}</h1><small style={{color:'#dda7b4'}}>Match ♥</small></div>
 <div style={{height:'min(52vh,480px)',overflowY:'auto',padding:12,border:'1px solid #3f252d',borderRadius:18,background:'#090708',display:'flex',flexDirection:'column',gap:10}}>
 {msgs.length?msgs.map(m=><div key={m.id} style={{alignSelf:m.sender_id===userId?'flex-end':'flex-start',maxWidth:'78%'}}><div style={{padding:'10px 13px 6px',borderRadius:16,background:m.sender_id===userId?'#7c203b':'#25151a',lineHeight:1.4}}>{m.body}<div style={{fontSize:10,opacity:.72,textAlign:'right',marginTop:4}}>{hora(m.created_at)}{m.sender_id===userId?' · '+(m.read_at?'Lida':'Enviada'):''}</div></div></div>):<p style={{textAlign:'center',color:'#9f8e93',margin:'auto'}}>Comece a conversa. Tudo começa com uma mensagem.</p>}<div ref={end}/></div>
 {status&&<p style={{color:'#dda7b4',fontSize:13}}>{status}</p>}<form onSubmit={enviar} style={{display:'flex',gap:10,marginTop:14}}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} placeholder="Digite uma mensagem..." style={{flex:1,minWidth:0,height:48,border:'1px solid #5c303b',borderRadius:999,background:'#0d090a',color:'white',padding:'0 16px',font:'inherit'}}/><button className="btn primary" type="submit">Enviar</button></form>
 </section></main>
}