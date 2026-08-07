import { supabase } from './src/lib/supabase.js';
console.log('Cliente importado:', supabase);

async function carregarTodosAtletas() {
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

    if (error) {
      console.error('Erro ao buscar atletas:', error)
      return
    }

    if (!atletas || atletas.length === 0) {
      console.error('Nenhum atleta cadastrado ainda.')
      return
    }

    exibirListaAtletas(atletas)

  } catch (err) {
    console.error('Erro inesperado:', err)
  }
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

  // Use o mesmo HTML que você já tinha para exibir os detalhes
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