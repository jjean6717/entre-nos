import type {Metadata} from 'next'; import './globals.css';
export const metadata:Metadata={title:'ENTRE NÓS',description:'Tudo começa com uma conversa.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
