import { supabase } from './src/lib/supabase.js';
import { requireAthlete } from './src/lib/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const context = await requireAthlete('../index.html');
  if (!context) return;
  const { athlete } = context;

  const form = document.getElementById('form-uniforme');
  form?.reset();
  const resultado = document.getElementById('resultado-busca');
  const statusEnvio = document.getElementById('submit-status');
  const btn = form?.querySelector('.btn-submit');
  let registroId = null;

  function mensagem(texto, erro = false) {
    if (!resultado) return;
    resultado.innerHTML = `<div style="padding:12px;border-radius:10px;border:1px solid ${erro ? '#fecaca' : '#bfdbfe'};background:${erro ? '#fff5f5' : '#eff6ff'};color:${erro ? '#991b1b' : '#1e3a8a'}">${texto}</div>`;
  }

  function preencher(id, valor) {
    const el = document.getElementById(id);
    if (el && valor !== null && valor !== undefined) el.value = valor;
  }

  async function carregar() {
    try {
      const { data, error } = await supabase
        .from('uniformes_atletas')
        .select('*')
        .eq('atleta_id', athlete.id)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        registroId = data.id || null;
        preencher('tamanho_camiseta', data.tamanho_camiseta);
        preencher('tamanho_short', data.tamanho_short);
        preencher('tamanho_tenis', data.tamanho_tenis);
        preencher('tamanho_sapatilha', data.tamanho_sapatilha);
        preencher('observacao_uniforme', data.observacao);
        mensagem(`<strong>${athlete.nome_completo}</strong>, seus tamanhos já cadastrados foram carregados para atualização.`);
      } else {
        mensagem(`<strong>${athlete.nome_completo}</strong>, os tamanhos informados serão vinculados automaticamente ao seu cadastro.`);
      }
    } catch (error) {
      console.error('Erro ao carregar uniforme:', error);
      mensagem('Não foi possível carregar os tamanhos cadastrados.', true);
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const dados = {
      atleta_id: athlete.id,
      tamanho_camiseta: document.getElementById('tamanho_camiseta')?.value || null,
      tamanho_short: document.getElementById('tamanho_short')?.value || null,
      tamanho_tenis: document.getElementById('tamanho_tenis')?.value || null,
      tamanho_sapatilha: document.getElementById('tamanho_sapatilha')?.value || null,
      observacao: document.getElementById('observacao_uniforme')?.value.trim() || null,
      updated_at: new Date().toISOString()
    };

    btn.disabled = true;
    btn.textContent = 'Salvando...';
    statusEnvio.style.display = 'block';
    statusEnvio.textContent = 'Salvando tamanhos...';

    try {
      const resposta = registroId
        ? await supabase.from('uniformes_atletas').update(dados).eq('id', registroId).select().maybeSingle()
        : await supabase.from('uniformes_atletas').insert([dados]).select().maybeSingle();
      if (resposta.error) throw resposta.error;
      registroId = resposta.data?.id || registroId;
      statusEnvio.style.background = '#d1e7dd';
      statusEnvio.style.color = '#0f5132';
      statusEnvio.textContent = '✓ Tamanhos salvos com sucesso!';
      window.location.replace('../home.html');
    } catch (error) {
      console.error('Erro ao salvar uniforme:', error);
      statusEnvio.style.background = '#f8d7da';
      statusEnvio.style.color = '#842029';
      statusEnvio.textContent = `Erro ao salvar: ${error.message || 'tente novamente.'}`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar Tamanhos';
    }
  });

  await carregar();
});
