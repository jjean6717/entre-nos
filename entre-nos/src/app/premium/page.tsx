"use client"
import Link from 'next/link'
import { useState } from 'react'
type PixData={orderId?:string;status?:string;statusDetail?:string;qrCode?:string|null;qrCodeBase64?:string|null;ticketUrl?:string|null;amount?:string;test?:boolean}
export default function Page(){
 const[loading,setLoading]=useState(false);const[pix,setPix]=useState<PixData|null>(null);const[message,setMessage]=useState('')
 async function gerarPix(){setLoading(true);setMessage('');setPix(null);try{const r=await fetch('/api/mercado-pago/pix',{method:'POST'});const d=await r.json();if(!r.ok){setMessage(d?.error||'Não foi possível gerar o PIX.');return}setPix(d)}catch{setMessage('Não foi possível conectar ao serviço de pagamento.')}finally{setLoading(false)}}
 async function copiar(){if(!pix?.qrCode)return;await navigator.clipboard.writeText(pix.qrCode);setMessage('Código PIX copiado.')}
 return <main className="center"><div className="panel premium" style={{maxWidth:720}}><div className="brand">ENTRE <b>NÓS</b></div><p className="tag">PREMIUM</p><h1>Mais possibilidades para se conectar.</h1><div className="price"><span>R$ 47,90</span><strong>R$ 27,90</strong><small>/ 30 dias</small></div><p>Oferta de lançamento • Pagamento via PIX</p>
 {!pix&&<button className="btn primary" onClick={gerarPix} disabled={loading}>{loading?'Gerando PIX...':'Gerar PIX'}</button>}
 {message&&<p style={{marginTop:14}}>{message}</p>}
 {pix&&<section style={{marginTop:22,padding:20,border:'1px solid rgba(190,80,105,.5)',borderRadius:18,textAlign:'center'}}><p className="tag">PIX DE TESTE</p><h2>R$ {pix.amount?.replace('.',',')}</h2>
 {pix.qrCodeBase64&&<img src={`data:image/jpeg;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" width={240} height={240} style={{maxWidth:'100%',height:'auto',background:'#fff',padding:10,borderRadius:12}}/>}
 {pix.qrCode&&<><p style={{marginTop:16}}>PIX Copia e Cola</p><textarea readOnly value={pix.qrCode} rows={4} style={{width:'100%',padding:12,borderRadius:12,resize:'none'}}/><button className="btn primary" onClick={copiar} style={{marginTop:10}}>Copiar código PIX</button></>}
 {pix.ticketUrl&&<p style={{marginTop:14}}><a href={pix.ticketUrl} target="_blank" rel="noreferrer">Abrir instruções do PIX</a></p>}
 <p style={{opacity:.75,marginTop:16}}>Ambiente de teste. O Premium ainda não é ativado automaticamente nesta etapa.</p></section>}
 <div style={{marginTop:20}}><Link href="/">Voltar</Link></div></div></main>
}
