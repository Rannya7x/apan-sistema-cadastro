import { supabase } from './src/lib/supabase.js';
import { requireAthlete } from './src/lib/auth.js';

const BUCKET_NAME = 'documentos-atletas';

document.addEventListener('DOMContentLoaded', async () => {
  const context = await requireAthlete('../index.html');
  if (!context) return;

  const { user, athlete } = context;
  const atletaId = athlete.id;
  const form = document.getElementById('form-cbat');
  form?.reset();
  const btnSubmit = form?.querySelector('.btn-submit');
  const submitStatus = document.getElementById('submit-status');
  const resultado = document.getElementById('resultado-busca');

  const inputs = {
    foto: document.getElementById('foto'),
    rg: document.getElementById('doc-rg-cpf'),
    comprovante: document.getElementById('comprovante-residencia'),
    sus: document.getElementById('cartao-sus'),
    laudo: document.getElementById('laudo-medico')
  };
  const termos = {
    imagem: document.getElementById('termo_imagem'),
    whatsapp: document.getElementById('termo_whatsapp'),
    lgpd: document.getElementById('termo_lgpd')
  };

  let documentoExistenteId = null;
  let urls = {
    foto_url: null,
    rg_cpf_url: null,
    comprovante_residencia_url: null,
    cartao_sus_url: null,
    laudo_medico_url: null
  };

  function preview(id, url, rotulo) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = url
      ? `<span style="color:#0f5132">✓ Arquivo já enviado:</span> <a href="${url}" target="_blank" rel="noopener noreferrer">Ver ${rotulo}</a> <small>(envie outro para substituir)</small>`
      : '';
  }

  function status(texto, erro = false) {
    if (!resultado) return;
    resultado.style.display = 'block';
    resultado.innerHTML = `<div style="padding:12px;border-radius:10px;border:1px solid ${erro ? '#fecaca' : '#bfdbfe'};background:${erro ? '#fff5f5' : '#eff6ff'};color:${erro ? '#991b1b' : '#1e3a8a'}">${texto}</div>`;
  }

  async function carregar() {
    try {
      const { data: docs, error } = await supabase
        .from('documentos_atletas')
        .select('*')
        .eq('atleta_id', atletaId)
        .maybeSingle();
      if (error) throw error;

      if (docs) {
        documentoExistenteId = docs.id || null;
        urls = {
          foto_url: docs.foto_url || null,
          rg_cpf_url: docs.rg_cpf_url || null,
          comprovante_residencia_url: docs.comprovante_residencia_url || null,
          cartao_sus_url: docs.cartao_sus_url || null,
          laudo_medico_url: docs.laudo_medico_url || null
        };
        if (urls.foto_url && inputs.foto) inputs.foto.required = false;
        if (urls.rg_cpf_url && inputs.rg) inputs.rg.required = false;
        if (urls.comprovante_residencia_url && inputs.comprovante) inputs.comprovante.required = false;
        if (termos.imagem) termos.imagem.checked = !!docs.termo_imagem;
        if (termos.whatsapp) termos.whatsapp.checked = !!docs.termo_whatsapp;
        if (termos.lgpd) termos.lgpd.checked = !!docs.termo_lgpd;
        preview('preview-foto', urls.foto_url, 'Foto');
        preview('preview-doc-rg-cpf', urls.rg_cpf_url, 'RG/CPF');
        preview('preview-comprovante-residencia', urls.comprovante_residencia_url, 'Comprovante');
        preview('preview-cartao-sus', urls.cartao_sus_url, 'Cartão SUS');
        preview('preview-laudo-medico', urls.laudo_medico_url, 'Laudo');
        status(`<strong>${athlete.nome_completo}</strong>, seus documentos já cadastrados foram carregados. Você pode substituí-los abaixo.`);
      } else {
        status(`<strong>${athlete.nome_completo}</strong>, este formulário já está vinculado automaticamente ao seu cadastro.`);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      status('Não foi possível carregar os documentos já cadastrados.', true);
    }
  }

  async function upload(file, tipo) {
    if (!file) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${user.id}/${tipo}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando documentos...';
    if (submitStatus) {
      submitStatus.style.display = 'block';
      submitStatus.textContent = 'Salvando informações...';
    }

    try {
      const dados = {
        atleta_id: atletaId,
        foto_url: inputs.foto?.files[0] ? await upload(inputs.foto.files[0], 'foto') : urls.foto_url,
        rg_cpf_url: inputs.rg?.files[0] ? await upload(inputs.rg.files[0], 'rg_cpf') : urls.rg_cpf_url,
        comprovante_residencia_url: inputs.comprovante?.files[0] ? await upload(inputs.comprovante.files[0], 'comprovante') : urls.comprovante_residencia_url,
        cartao_sus_url: inputs.sus?.files[0] ? await upload(inputs.sus.files[0], 'sus') : urls.cartao_sus_url,
        laudo_medico_url: inputs.laudo?.files[0] ? await upload(inputs.laudo.files[0], 'laudo') : urls.laudo_medico_url,
        termo_imagem: !!termos.imagem?.checked,
        termo_whatsapp: !!termos.whatsapp?.checked,
        termo_lgpd: !!termos.lgpd?.checked,
        updated_at: new Date().toISOString()
      };

      const resposta = documentoExistenteId
        ? await supabase.from('documentos_atletas').update(dados).eq('id', documentoExistenteId).select().maybeSingle()
        : await supabase.from('documentos_atletas').insert([dados]).select().maybeSingle();

      if (resposta.error) throw resposta.error;
      documentoExistenteId = resposta.data?.id || documentoExistenteId;
      urls = { ...urls, ...dados };

      submitStatus.style.background = '#d1e7dd';
      submitStatus.style.color = '#0f5132';
      submitStatus.textContent = '✓ Documentos e termos salvos com sucesso!';
      window.location.replace('../home.html');
    } catch (error) {
      console.error('Erro ao salvar documentos:', error);
      submitStatus.style.background = '#f8d7da';
      submitStatus.style.color = '#842029';
      submitStatus.textContent = `Erro ao salvar: ${error.message || 'tente novamente.'}`;
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Finalizar e Enviar Cadastro';
    }
  });

  await carregar();
});
