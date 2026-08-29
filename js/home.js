import { requireAthlete, signOutAndRedirect } from './src/lib/auth.js';
async function init(){const c=await requireAthlete('./index.html');if(!c)return;document.getElementById('athlete-name').textContent=c.athlete.nome_completo||'Atleta';document.getElementById('btn-logout')?.addEventListener('click',()=>signOutAndRedirect('./index.html'));}
init().catch((e)=>{console.error(e);window.location.replace('./index.html');});
