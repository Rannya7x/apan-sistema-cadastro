import { requireAdmin, signOutAndRedirect } from './src/lib/auth.js';
async function init(){const c=await requireAdmin('./index.html');if(!c)return;document.getElementById('admin-name').textContent=c.admin.nome||c.user.email||'Administrador';document.getElementById('btn-logout')?.addEventListener('click',()=>signOutAndRedirect('./index.html'));}
init().catch((e)=>{console.error(e);window.location.replace('./index.html');});
