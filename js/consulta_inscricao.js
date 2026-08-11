import { supabase } from './src/lib/supabase.js';

let atletasCache = [];

// Imagem neutra padrão para fallback
const AVATAR_PADRAO = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

// Helper para formatar CPF visualmente (ex: 000.000.000-00)
function formatarCPF(cpf) {
  if (!cpf) return 'Não informado';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Helper para formatar data (ex: 2000-05-20 -> 20/05/2000)
function formatarData(dataIso) {
  if (!dataIso) return 'Não informada';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
}

// ============================================
// CARREGAR TODOS OS ATLETAS (com joins)
// ============================================
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
      .select(`
        *,
        socioeconomico (*),
        documentos_atletas (*)
      `)
      .order('nome_completo');

    if (loading) loading.style.display = 'none';

    if (error) {
      if (areaErro) {
        areaErro.style.display = 'block';
        areaErro.innerHTML = `⚠️ Erro ao consultar banco de dados: ${error.message}`;
      }
      console.error('Erro Supabase:', error);
      return;
    }

    if (!atletas || atletas.length === 0) {
      if (conteudo) {
        conteudo.innerHTML = `
          <div class="mensagem-info" style="text-align:center; padding:30px; color:#6c757d;">
            <p style="font-size: 16px;">Nenhum atleta cadastrado até o momento.</p>
          </div>
        `;
      }
      return;
    }

    atletasCache = atletas;
    exibirListaAtletas(atletas);

  } catch (err) {
    if (loading) loading.style.display = 'none';
    console.error('Erro inesperado:', err);
  }
}

// ============================================
// BUSCA E FILTRO POR CPF
// ============================================
window.filtrarAtletasPorCpf = function () {
  const input = document.getElementById('cpf-consulta');
  if (!input) return;

  const cpfBusca = input.value.replace(/\D/g, '');

  if (!cpfBusca || cpfBusca.length === 0) {
    exibirListaAtletas(atletasCache);
    return;
  }

  const atletasFiltrados = atletasCache.filter(atleta => {
    const cpfAtleta = (atleta.cpf || '').replace(/\D/g, '');
    return cpfAtleta.includes(cpfBusca);
  });

  if (atletasFiltrados.length > 0) {
    exibirListaAtletas(atletasFiltrados);
  } else {
    exibirMensagemNaoEncontrado(cpfBusca);
  }
};

function exibirMensagemNaoEncontrado(cpf) {
  const conteudo = document.getElementById('resultado-conteudo');
  const areaErro = document.getElementById('area-erro');
  if (areaErro) areaErro.style.display = 'none';

  if (conteudo) {
    conteudo.innerHTML = `
      <div class="mensagem-info" style="text-align:center; padding:30px; color:#6c757d; background:#fff; border-radius:12px; border:1px solid #e9ecef;">
        <p style="font-size:16px;">🔍 Nenhum atleta encontrado com o CPF <strong>${formatarCPF(cpf)}</strong>.</p>
        <p style="font-size:14px; margin-top:8px;">Verifique o número digitado ou realize uma nova inscrição.</p>
      </div>
    `;
  }
}

// ============================================
// INICIALIZAÇÃO E EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Carrega os dados
  carregarTodosAtletas();

  // Máscara de CPF no campo de busca
  const inputCpf = document.getElementById('cpf-consulta');
  if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      
      e.target.value = value;
    });
  }
});

// ============================================
// EXIBIR LISTA COMPACTA DE CARDS
// ============================================
function exibirListaAtletas(atletas) {
  const areaResultados = document.getElementById('area-resultados');
  const conteudo = document.getElementById('resultado-conteudo');
  const areaErro = document.getElementById('area-erro');

  if (areaErro) areaErro.style.display = 'none';
  if (areaResultados) areaResultados.style.display = 'block';

  let html = `
    <div class="lista-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <span class="total" style="font-weight:600; color:#495057;">Encontrado(s): ${atletas.length} atleta(s)</span>
      <button id="btn-recargar" class="btn-pequeno" style="padding:6px 12px; cursor:pointer;">🔄 Recarregar</button>
    </div>
  `;

  atletas.forEach(atleta => {
    const fotoUrl = (atleta.documentos_atletas?.foto_url || atleta.foto_url || '').trim();
    const foto = fotoUrl || AVATAR_PADRAO;
    const pcdText = atleta.possui_deficiencia === 'sim' ? (atleta.tipo_deficiencia || 'Sim') : 'Não PCD';

    html += `
      <div class="card-lista" data-id="${atleta.id}" style="background:#fff; border:1px solid #e9ecef; border-radius:12px; padding:18px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; min-width:64px; border-radius:50%; overflow:hidden; border:2px solid #1a73e8; background:#e7f3ff;">
            <img src="${foto}" alt="Atleta" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <strong style="font-size:18px; color:#1a73e8; word-break:break-word;">${atleta.nome_completo}</strong>
              <span class="badge" style="background:#e7f3ff; color:#1a73e8; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap;">${pcdText}</span>
            </div>
            <div style="display:flex; gap:16px; margin-top:8px; font-size:14px; color:#6c757d; flex-wrap:wrap;">
              <span><strong>CPF:</strong> ${formatarCPF(atleta.cpf)}</span>
              <span><strong>Módulo:</strong> ${atleta.modulo || 'Não informado'}</span>
              <span><strong>Nascimento:</strong> ${formatarData(atleta.data_nascimento)}</span>
            </div>
          </div>
        </div>
        <div style="margin-top:14px; text-align:right;">
          <button class="btn-detalhes" data-id="${atleta.id}" style="background:#1a73e8; color:#fff; border:none; padding:8px 18px; border-radius:8px; font-weight:600; cursor:pointer;">
            📄 Ver Detalhes Completos
          </button>
        </div>
      </div>
    `;
  });

  conteudo.innerHTML = html;

  document.querySelectorAll('.btn-detalhes').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const atleta = atletas.find(a => a.id === id);
      if (atleta) exibirDetalhesAtleta(atleta);
    });
  });

  document.getElementById('btn-recargar')?.addEventListener('click', carregarTodosAtletas);
}

// ============================================
// MODO DETALHADO (TODAS AS INFORMAÇÕES VINCULADAS)
// ============================================
function exibirDetalhesAtleta(atleta) {
  const conteudo = document.getElementById('resultado-conteudo');
  
  const socio = atleta.socioeconomico || {};
  const doc = atleta.documentos_atletas || {};
  const fotoPerfilUrl = (doc.foto_url || atleta.foto_url || '').trim();
  const fotoPerfil = fotoPerfilUrl || AVATAR_PADRAO;

  let html = `
    <button id="btn-voltar-lista" style="background:#f8f9fa; border:1px solid #dee2e6; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; margin-bottom:20px;">
      ← Voltar para a Lista
    </button>
    <div style="background:#fff; border-radius:14px; padding:24px; border:1px solid #e9ecef; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      
      <!-- Cabeçalho do Perfil -->
      <div style="display:flex; align-items:center; gap:20px; border-bottom:1px solid #eee; padding-bottom:20px; margin-bottom:20px; flex-wrap:wrap;">
        <div style="width:100px; height:100px; min-width:100px; border-radius:50%; overflow:hidden; border:3px solid #1a73e8; background:#e7f3ff;">
          <img src="${fotoPerfil}" alt="Perfil Atleta" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div>
          <h2 style="margin:0; font-size:24px; color:#1a73e8;">${atleta.nome_completo}</h2>
          <p style="margin:4px 0 0; color:#6c757d; font-size:14px;">CPF: <strong>${formatarCPF(atleta.cpf)}</strong> | Módulo: <strong>${atleta.modulo || 'Não informado'}</strong></p>
        </div>
      </div>

      <!-- SEÇÃO 1: DADOS CADASTRAIS (ATLETAS) -->
      <section style="margin-bottom:24px;">
        <h3 style="color:#1a73e8; font-size:16px; border-bottom:2px solid #e7f3ff; padding-bottom:6px; margin-bottom:12px;">📋 Dados Pessoais e Contato</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; font-size:14px;">
          <div><strong>Data de Nascimento:</strong> ${formatarData(atleta.data_nascimento)}</div>
          <div><strong>E-mail:</strong> ${atleta.email || 'Não informado'}</div>
          <div><strong>WhatsApp:</strong> ${atleta.whatsapp || 'Não informado'}</div>
          <div><strong>Nome do Responsável:</strong> ${atleta.nome_responsavel || 'Não necessário'}</div>
          <div><strong>Possui Deficiência:</strong> ${atleta.possui_deficiencia === 'sim' ? 'Sim' : 'Não'}</div>
          <div><strong>Tipo de Deficiência:</strong> ${atleta.tipo_deficiencia || 'Nenhum'}</div>
          <div><strong>Possui Equipamentos:</strong> ${atleta.possui_equipamentos === 'sim' ? (atleta.qual_equipamento || 'Sim') : 'Não'}</div>
        </div>
      </section>

      <!-- SEÇÃO 2: FICHA SOCIOECONÔMICA (COMPLETA) -->
      <section style="margin-bottom:24px;">
        <h3 style="color:#1a73e8; font-size:16px; border-bottom:2px solid #e7f3ff; padding-bottom:6px; margin-bottom:12px;">🏠 Ficha Socioeconômica</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; font-size:14px;">
          <div><strong>RG:</strong> ${socio.rg_numero || 'Não cadastrado'} (${socio.rg_orgao_expeditor || ''}/${socio.rg_uf || ''})</div>
          <div><strong>Gênero:</strong> ${socio.genero || 'Não informado'}</div>
          <div><strong>Etnia:</strong> ${socio.etnia || 'Não informada'}</div>
          <div><strong>Estado Civil:</strong> ${socio.estado_civil || 'Não informado'}</div>
          <div><strong>Nome da Mãe:</strong> ${socio.nome_mae || 'Não informado'}</div>
          <div><strong>Nome do Pai:</strong> ${socio.nome_pai || 'Não informado'}</div>
          <div><strong>Contato de Emergência:</strong> ${socio.contato_emergencia || 'Não informado'}</div>
          <div><strong>Escolaridade:</strong> ${socio.escolaridade_do_atleta || 'Não informada'}</div>
          <div><strong>Atividade Remunerada:</strong> ${socio.possui_atividade_remunerada ? 'Sim' : 'Não'}</div>
          <div><strong>Profissão Atual:</strong> ${socio.profissao_atual || 'Não informada'}</div>
          <div><strong>Vínculo Empregatício:</strong> ${socio.vinculo_empregaticio || 'Não informado'}</div>
          <div><strong>Habitação:</strong> ${socio.tipo_habitacao || 'Não informada'}</div>
          <div><strong>Mora com Quem:</strong> ${socio.mora_com_quem || 'Não informado'}</div>
          <div><strong>Residentes na Casa:</strong> ${socio.quantidade_residentes || 'Não informado'}</div>
          <div><strong>Renda Familiar:</strong> ${socio.renda_familiar_mensal || 'Não informada'}</div>
          <div><strong>Possui CadÚnico:</strong> ${socio.possui_cadunico ? 'Sim' : 'Não'}</div>
          <div><strong>Número do NIS:</strong> ${socio.numero_nis || 'Não informado'}</div>
          <div><strong>Benefício do Governo:</strong> ${socio.recebe_beneficio_governo || 'Nenhum'}</div>
          <div><strong>Transporte Treino:</strong> ${socio.meio_transporte_treino || 'Não informado'}</div>
        </div>
      </section>

      <!-- SEÇÃO 3: DOCUMENTAÇÃO E TERMOS -->
      <section>
        <h3 style="color:#1a73e8; font-size:16px; border-bottom:2px solid #e7f3ff; padding-bottom:6px; margin-bottom:12px;">📁 Anexos e Termos Aceitos</h3>
        
        <!-- Status dos Termos -->
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; font-size:13px;">
          <span style="padding:6px 12px; border-radius:6px; background:${doc.termo_imagem ? '#d1e7dd' : '#f8d7da'}; color:${doc.termo_imagem ? '#0f5132' : '#842029'};">
            ${doc.termo_imagem ? '✓ Termo Uso de Imagem' : '✗ Termo de Imagem ausente'}
          </span>
          <span style="padding:6px 12px; border-radius:6px; background:${doc.termo_whatsapp ? '#d1e7dd' : '#f8d7da'}; color:${doc.termo_whatsapp ? '#0f5132' : '#842029'};">
            ${doc.termo_whatsapp ? '✓ Código do WhatsApp' : '✗ Termo WhatsApp ausente'}
          </span>
          <span style="padding:6px 12px; border-radius:6px; background:${doc.termo_lgpd ? '#d1e7dd' : '#f8d7da'}; color:${doc.termo_lgpd ? '#0f5132' : '#842029'};">
            ${doc.termo_lgpd ? '✓ Diretrizes LGPD' : '✗ Termo LGPD ausente'}
          </span>
        </div>

        <!-- Links dos Documentos -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          ${gerarLinkDocumento('Foto Rosto (CBAt)', doc.foto_url || atleta.foto_url)}
          ${gerarLinkDocumento('Documento RG/CPF/CNH', doc.rg_cpf_url)}
          ${gerarLinkDocumento('Comprovante Residência', doc.comprovante_residencia_url)}
          ${gerarLinkDocumento('Cartão do SUS', doc.cartao_sus_url)}
          ${gerarLinkDocumento('Laudo Médico (PCD)', doc.laudo_medico_url)}
        </div>
      </section>

    </div>
  `;

  conteudo.innerHTML = html;
  document.getElementById('btn-voltar-lista')?.addEventListener('click', () => exibirListaAtletas(atletasCache));
}

// Helper para montar botão de link de documento
function gerarLinkDocumento(titulo, url) {
  if (!url) {
    return `
      <div style="padding:10px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; font-size:13px; color:#adb5bd;">
        <strong>${titulo}:</strong> <br>Não enviado
      </div>
    `;
  }

  return `
    <div style="padding:10px; background:#e7f3ff; border:1px solid #c5d5ea; border-radius:8px; font-size:13px;">
      <strong style="color:#0c4a6e;">${titulo}:</strong> <br>
      <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8; font-weight:600; text-decoration:underline;">
        🔗 Abrir Arquivo
      </a>
    </div>
  `;
}