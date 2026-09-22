'use client'
import Link from 'next/link'
import { FormEvent,useEffect,useRef,useState } from 'react'
import { useParams,useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase'
type Msg={id:string;sender_id:string;body:string;created_at:string;read_at:string|null}
export default function Chat(){
 const s=createClient(),params=useParams(),router=useRouter(),matchId=String(params.id)
 const[userId,setUserId]=useState(''),[otherId,setOtherId]=useState(''),[name,setName]=useState('Match'),[msgs,setMsgs]=useState<Msg[]>([]),[body,setBody]=useState(''),[status,setStatus]=useState('Carregando...'),[menu,setMenu]=useState(false),[sending,setSending]=useState(false)
 const end=useRef<HTMLDivElement>(null)
 useEffect(()=>{let timer:any;(async()=>{const{data:{user}}=await s.auth.getUser();if(!user){location.href='/entrar';return}setUserId(user.id)
 const{data:m,error}=await s.from('matches').select('user_a,user_b').eq('id',matchId).single();if(error||!m){setStatus('Conversa não encontrada.');return}
 const other=m.user_a===user.id?m.user_b:m.user_a;setOtherId(other);const{data:p}=await s.from('profiles').select('display_name').eq('id',other).single();setName(p?.display_name||'Match')
 await carregar(user.id);timer=setInterval(()=>carregar(user.id),1800)})();return()=>clearInterval(timer)},[matchId])
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'})},[msgs])
 async function carregar(uid:string){const{data,error}=await s.from('messages').select('id,sender_id,body,created_at,read_at').eq('match_id',matchId).order('created_at',{ascending:true});if(!error){setMsgs(data||[]);setStatus('');const unread=(data||[]).filter(x=>x.sender_id!==uid&&!x.read_at).map(x=>x.id);if(unread.length)await s.from('messages').update({read_at:new Date().toISOString()}).in('id',unread)}}
 async function enviar(e:FormEvent){e.preventDefault();const text=body.trim();if(!text||sending)return;setSending(true);setStatus('')
 const{data:{session}}=await s.auth.getSession();if(!session?.user){setSending(false);setStatus('Sua sessão expirou. Entre novamente para enviar mensagens.');return}
 const uid=session.user.id;if(!userId)setUserId(uid)
 const{data:match,error:matchError}=await s.from('matches').select('user_a,user_b').eq('id',matchId).single()
 if(matchError||!match||!(match.user_a===uid||match.user_b===uid)){setSending(false);setStatus('Esta conversa não está disponível para esta conta.');return}
 const{error}=await s.from('messages').insert({match_id:matchId,sender_id:uid,body:text})
 if(error){console.error('Erro ao enviar mensagem:',error);setSending(false);setStatus(`Não foi possível enviar: ${error.message}`);return}
 setBody('');await carregar(uid);setSending(false)}
 async function bloquear(){if(!otherId||!confirm(`Bloquear ${name}? Essa pessoa não poderá mais interagir com você.`))return;const{error}=await s.from('blocks').insert({blocker_id:userId,blocked_id:otherId});if(error&&error.code!=='23505'){alert('Não foi possível bloquear agora.');return}alert('Usuário bloqueado.');router.push('/conversas')}
 async function denunciar(){if(!otherId)return;const motivo=prompt('Motivo da denúncia (ex.: assédio, perfil falso, conteúdo inadequado):');if(!motivo?.trim())return;const detalhes=prompt('Conte mais detalhes, se desejar:')||null;const{error}=await s.from('reports').insert({reporter_id:userId,reported_id:otherId,reason:motivo.trim(),details:detalhes});if(error){alert('Não foi possível enviar a denúncia.');return}alert('Denúncia enviada para análise. Obrigado por ajudar a manter a comunidade segura.');setMenu(false)}
 const hora=(d:string)=>new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(d))
 return <main className="center"><section style={{width:'min(620px,100%)',padding:24,border:'1px solid #4b2731',borderRadius:28,background:'#110c0ee8'}}>
 <div className="top"><Link href="/conversas">← CONVERSAS</Link><span>ENTRE NÓS</span></div>
 <div style={{margin:'24px 0 16px',display:'flex',justifyContent:'space-between',alignItems:'start',gap:16}}><div><h1 style={{font:'500 34px Georgia,serif',margin:0}}>{name}</h1><small style={{color:'#dda7b4'}}>Match ♥</small></div><div style={{position:'relative'}}><button onClick={()=>setMenu(!menu)} aria-label="Opções de segurança" style={{border:'1px solid #5c303b',borderRadius:999,background:'#160e11',color:'#fff',width:42,height:42,fontSize:20,cursor:'pointer'}}>•••</button>{menu&&<div style={{position:'absolute',right:0,top:48,zIndex:5,width:190,padding:8,border:'1px solid #5c303b',borderRadius:14,background:'#160e11',boxShadow:'0 14px 35px #0008'}}><button onClick={denunciar} style={{width:'100%',padding:11,textAlign:'left',border:0,background:'transparent',color:'#fff',cursor:'pointer'}}>Denunciar perfil</button><button onClick={bloquear} style={{width:'100%',padding:11,textAlign:'left',border:0,background:'transparent',color:'#ff9cad',cursor:'pointer'}}>Bloquear usuário</button></div>}</div></div>
 <div style={{height:'min(52vh,480px)',overflowY:'auto',padding:12,border:'1px solid #3f252d',borderRadius:18,background:'#090708',display:'flex',flexDirection:'column',gap:10}}>{msgs.length?msgs.map(m=><div key={m.id} style={{alignSelf:m.sender_id===userId?'flex-end':'flex-start',maxWidth:'78%'}}><div style={{padding:'10px 13px 6px',borderRadius:16,background:m.sender_id===userId?'#7c203b':'#25151a',lineHeight:1.4}}>{m.body}<div style={{fontSize:10,opacity:.72,textAlign:'right',marginTop:4}}>{hora(m.created_at)}{m.sender_id===userId?' · '+(m.read_at?'Lida':'Enviada'):''}</div></div></div>):<p style={{textAlign:'center',color:'#9f8e93',margin:'auto'}}>Comece a conversa. Tudo começa com uma mensagem.</p>}<div ref={end}/></div>
 {status&&<p style={{color:'#dda7b4',fontSize:13}}>{status}</p>}<form onSubmit={enviar} style={{display:'flex',gap:10,marginTop:14}}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} placeholder="Digite uma mensagem..." disabled={sending} style={{flex:1,minWidth:0,height:48,border:'1px solid #5c303b',borderRadius:999,background:'#0d090a',color:'white',padding:'0 16px',font:'inherit'}}/><button className="btn primary" type="submit" disabled={sending}>{sending?'Enviando...':'Enviar'}</button></form>
 </section></main>
}