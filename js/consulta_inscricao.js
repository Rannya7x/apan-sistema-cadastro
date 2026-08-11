import { supabase } from './src/lib/supabase.js';

let atletasCache = [];

const AVATAR_PADRAO = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

function formatarCPF(cpf) {
  if (!cpf) return 'Não informado';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarData(dataIso) {
  if (!dataIso) return 'Não informada';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
}

async function carregarTodosAtletas() {
  const areaResultados = document.getElementById('area-resultados');
  const loading = document.getElementById('loading-indicator');
  const conteudo = document.getElementById('resultado-conteudo');
  const areaErro = document.getElementById('area-erro');

  if (loading) loading.style.display = 'block';
  if (conteudo) conteudo.innerHTML = ''; 
  if (areaErro) areaErro.style.display = 'none';
  if (areaResultados) areaResultados.style.display = 'block';

  try {
    const { data: atletas, error } = await supabase
      .from('atletas')
      .select(`*, socioeconomico (*), documentos_atletas (*)`)
      .order('nome_completo');

    if (loading) loading.style.display = 'none';

    if (error) {
      if (areaErro) {
        areaErro.style.display = 'block';
        areaErro.innerHTML = `⚠️ Erro ao consultar banco de dados: ${error.message}`;
      }
      return;
    }

    if (!atletas || atletas.length === 0) {
      if (conteudo) conteudo.innerHTML = `<div style="text-align:center; padding:30px; color:#6c757d;">Nenhum atleta cadastrado.</div>`;
      return;
    }

    atletasCache = atletas;
    exibirListaAtletas(atletas);
  } catch (err) {
    if (loading) loading.style.display = 'none';
    console.error(err);
  }
}

window.filtrarAtletasPorCpf = function () {
  const input = document.getElementById('cpf-consulta');
  const cpfBusca = input.value.replace(/\D/g, '');
  if (!cpfBusca) return exibirListaAtletas(atletasCache);

  const atletasFiltrados = atletasCache.filter(a => (a.cpf || '').replace(/\D/g, '').includes(cpfBusca));
  atletasFiltrados.length > 0 ? exibirListaAtletas(atletasFiltrados) : exibirMensagemNaoEncontrado(cpfBusca);
};

function exibirMensagemNaoEncontrado(cpf) {
  document.getElementById('resultado-conteudo').innerHTML = `<div style="text-align:center; padding:30px;">Nenhum atleta encontrado com o CPF ${formatarCPF(cpf)}.</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  carregarTodosAtletas();
  const inputCpf = document.getElementById('cpf-consulta');
  if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, "").slice(0, 11);
      e.target.value = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    });
  }
});

function exibirListaAtletas(atletas) {
  const conteudo = document.getElementById('resultado-conteudo');
  let html = `<div style="margin-bottom:16px;">Encontrado(s): ${atletas.length} atleta(s)</div>`;

  atletas.forEach(atleta => {
    const foto = (atleta.documentos_atletas?.foto_url || atleta.foto_url || '').trim() || AVATAR_PADRAO;
    html += `
      <div style="background:#fff; border:1px solid #e9ecef; border-radius:12px; padding:18px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <img src="${foto}" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #1a73e8;">
          <div>
            <strong style="font-size:18px; color:#1a73e8;">${atleta.nome_completo}</strong>
            <div style="font-size:14px; color:#6c757d;">CPF: ${formatarCPF(atleta.cpf)}</div>
          </div>
        </div>
        <button class="btn-detalhes" data-id="${atleta.id}" style="margin-top:14px; background:#1a73e8; color:#fff; border:none; padding:8px 18px; border-radius:8px; cursor:pointer;">Ver Detalhes Completos</button>
      </div>
    `;
  });

  conteudo.innerHTML = html;
  document.querySelectorAll('.btn-detalhes').forEach(btn => {
    btn.addEventListener('click', () => {
      const atleta = atletas.find(a => a.id === btn.dataset.id);
      if (atleta) exibirDetalhesAtleta(atleta);
    });
  });
}

// ============================================
// MODO DETALHADO (VERSÃO ATUALIZADA E COMPLETA)
// ============================================
function exibirDetalhesAtleta(atleta) {
  const conteudo = document.getElementById('resultado-conteudo');
  const socio = atleta.socioeconomico || {};
  const doc = atleta.documentos_atletas || {};
  const fotoPerfil = (doc.foto_url || atleta.foto_url || '').trim() || AVATAR_PADRAO;

  conteudo.innerHTML = `
    <button id="btn-voltar" style="margin-bottom:20px; padding:8px 16px; cursor:pointer;">← Voltar</button>
    <div style="background:#fff; padding:24px; border:1px solid #e9ecef; border-radius:14px;">
      <h2 style="color:#1a73e8;">${atleta.nome_completo}</h2>
      
      <section style="margin-bottom:24px;">
        <h3>📋 Dados Pessoais</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div><strong>Data Nasc:</strong> ${formatarData(atleta.data_nascimento)}</div>
          <div><strong>E-mail:</strong> ${atleta.email || 'N/A'}</div>
          <div><strong>WhatsApp:</strong> ${atleta.whatsapp || 'N/A'}</div>
        </div>
      </section>

      <section style="margin-bottom:24px;">
        <h3>🏠 Ficha Socioeconômica Completa</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div><strong>RG:</strong> ${socio.rg_numero || 'N/A'}</div>
          <div><strong>Gênero:</strong> ${socio.genero || 'N/A'}</div>
          <div><strong>Etnia:</strong> ${socio.etnia || 'N/A'}</div>
          <div><strong>Estado Civil:</strong> ${socio.estado_civil || 'N/A'}</div>
          <div><strong>Nome da Mãe:</strong> ${socio.nome_mae || 'N/A'}</div>
          <div><strong>Nome do Pai:</strong> ${socio.nome_pai || 'N/A'}</div>
          <div><strong>Emergência:</strong> ${socio.contato_emergencia || 'N/A'}</div>
          <div><strong>Escolaridade:</strong> ${socio.escolaridade_do_atleta || 'N/A'}</div>
          <div><strong>Profissão:</strong> ${socio.profissao_atual || 'N/A'}</div>
          <div><strong>Renda Familiar:</strong> ${socio.renda_familiar_mensal || 'N/A'}</div>
          <div><strong>Mora com:</strong> ${socio.mora_com_quem || 'N/A'}</div>
          <div><strong>Transporte:</strong> ${socio.meio_transporte_treino || 'N/A'}</div>
        </div>
      </section>

      <section>
        <h3>📁 Documentos</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${gerarLinkDocumento('RG/CPF', doc.rg_cpf_url)}
          ${gerarLinkDocumento('Comprovante Res.', doc.comprovante_residencia_url)}
          ${gerarLinkDocumento('Laudo Médico', doc.laudo_medico_url)}
        </div>
      </section>
    </div>
  `;
  document.getElementById('btn-voltar').addEventListener('click', () => exibirListaAtletas(atletasCache));
}

function gerarLinkDocumento(titulo, url) {
  if (!url) return `<span style="padding:5px; background:#eee;">${titulo}: Ausente</span>`;
  return `<a href="${url}" target="_blank" style="padding:5px; background:#e7f3ff;">🔗 ${titulo}</a>`;
}