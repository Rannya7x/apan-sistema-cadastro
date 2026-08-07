import { supabase } from './src/lib/supabase.js';
console.log('Cliente importado:', supabase);

let atletasCache = [];

async function carregarTodosAtletas() {
  const areaResultados = document.getElementById('area-resultados');
  const loading = document.getElementById('loading-indicator');
  const conteudo = document.getElementById('resultado-conteudo');
  const areaErro = document.getElementById('area-erro');

  loading.style.display = 'block';
  conteudo.innerHTML = ''; // limpa resultados antigos
  areaErro.style.display = 'none';
  areaResultados.style.display = 'block'; // garante que a área fique visível

  try {
    const { data: atletas, error } = await supabase
      .from('atletas')
      .select(`
        *,
        socioeconomico (*),
        saude_autonomia (*),
        dados_esportivos (
          *,
          treinadores (id, nome)
        )
      `)
      .order('nome_completo') // ordena por nome

    loading.style.display = 'none';

    if (error) {
      areaErro.style.display = 'block';
      console.error('Erro ao buscar atletas:', error)
      return
    }

    if (!atletas || atletas.length === 0) {
      console.error('Nenhum atleta cadastrado ainda.')
      return
    }
    atletasCache = atletas;
    exibirListaAtletas(atletas)

  } catch (err) {
    console.error('Erro inesperado:', err)
  }
}

//BUSCA POR CPF
window.filtrarAtletasPorCpf = function () {
  const input = document.getElementById('cpf-consulta');
  const cpf = input.value.replace(/[^0-9]/g, ''); // remove pontuação

  // Se o campo estiver vazio, recarrega a lista completa
  if (!cpf || cpf.length === 0) {
    exibirListaAtletas(atletasCache);
    return;
  }

  // Filtrar a lista em cache
  const atletasFiltrados = atletasCache.filter(atleta => {
    // Remove pontuação do CPF do atleta para comparação
    const cpfAtleta = (atleta.cpf || '').replace(/[^0-9]/g, '');
    return cpfAtleta.includes(cpf); // busca parcial (ou use === para exato)
  });

  // Se encontrou, exibe os filtrados; senão, exibe mensagem
  if (atletasFiltrados.length > 0) {
    exibirListaAtletas(atletasFiltrados);
  } else {
    exibirMensagemNaoEncontrado(cpf);
  }
}

function exibirMensagemNaoEncontrado(cpf) {
  const conteudo = document.getElementById('resultado-conteudo');
  const areaErro = document.getElementById('area-erro');
  areaErro.style.display = 'none'; // esconde erros

  conteudo.innerHTML = `
    <div class="mensagem-info" style="text-align:center; padding:20px; color:#6c757d;">
      <p>🔍 Nenhum atleta encontrado com o CPF <strong>${cpf}</strong>.</p>
      <p style="font-size:14px;">Tente novamente ou verifique o número digitado.</p>
    </div>
  `;
}

// EXIBIR LISTA DE ATLETAS (cards compactos)

function exibirListaAtletas(atletas) {
  const areaResultados = document.getElementById('area-resultados')
  const conteudo = document.getElementById('resultado-conteudo')
  const areaErro = document.getElementById('area-erro')

  areaErro.style.display = 'none'
  areaResultados.style.display = 'block'

  let html = `
    <div class="lista-header">
      <span class="total">${atletas.length} atleta(s) encontrado(s)</span>
      <button id="btn-recargar" class="btn-pequeno">🔄 Recarregar</button>
    </div>
  `

  atletas.forEach(atleta => {
    const treinadorNome = atleta.dados_esportivos?.treinadores?.nome || 'Não definido'
    const esporte = atleta.dados_esportivos?.esporte_principal || 'Não definido'
    
    html += `
      <div class="card-lista" data-id="${atleta.id}">
        <div class="card-lista-header">
          <strong>${atleta.nome_completo}</strong>
          <span class="badge">${atleta.tipo_deficiencia || 'Não informado'}</span>
        </div>
        <div class="card-lista-body">
          <div class="campo-lista">
            <span class="label">CPF:</span>
            <span>${atleta.cpf}</span>
          </div>
          <div class="campo-lista">
            <span class="label">Esporte:</span>
            <span>${esporte}</span>
          </div>
          <div class="campo-lista">
            <span class="label">Treinador:</span>
            <span>${treinadorNome}</span>
          </div>
        </div>
        <button class="btn-detalhes" data-id="${atleta.id}">Ver detalhes</button>
      </div>
    `
  })

  conteudo.innerHTML = html

  // Adiciona eventos para os botões "Ver detalhes"
  document.querySelectorAll('.btn-detalhes').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const atleta = atletas.find(a => a.id === id)
      if (atleta) exibirDetalhesAtleta(atleta)
    })
  })

  // Evento do botão recarregar
  document.getElementById('btn-recargar')?.addEventListener('click', carregarTodosAtletas)
}

// ============================================
// EXIBIR DETALHES DE UM ATLETA (modo detalhado)
// ============================================
function exibirDetalhesAtleta(atleta) {
  const areaResultados = document.getElementById('area-resultados')
  const conteudo = document.getElementById('resultado-conteudo')
  const areaErro = document.getElementById('area-erro')

  areaErro.style.display = 'none'
  areaResultados.style.display = 'block'

  let html = `
    <button id="btn-voltar-lista" class="btn-pequeno">← Voltar para lista</button>
    <div class="card-dados">
      <h3>📋 Dados Pessoais</h3>
      <!-- ... (copie seu HTML de exibição detalhada) ... -->
    </div>
    <!-- mais cards -->
  `

  conteudo.innerHTML = html

  // Evento para voltar à lista
  document.getElementById('btn-voltar-lista')?.addEventListener('click', () => {
    carregarTodosAtletas() // recarrega a lista
  })
}

carregarTodosAtletas() 