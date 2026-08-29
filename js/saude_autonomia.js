import { supabase } from './src/lib/supabase.js';
import { requireAthlete } from './src/lib/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const context = await requireAthlete('../index.html');
  if (!context) return;
  const { athlete } = context;

  const form = document.getElementById('form-saude');
  form?.reset();
  const btnSubmit = form?.querySelector('.btn-submit');
  const submitStatus = document.getElementById('submit-status');
  const resultado = document.getElementById('resultado-busca');
  const campoCausa = document.getElementById('campo-causa');
  const campoMedicamento = document.getElementById('campo-medicamento');
  const selectNatureza = document.getElementById('natureza_deficiencia');
  let registroId = null;

  function status(texto, erro = false) {
    if (!resultado) return;
    resultado.style.display = 'block';
    resultado.innerHTML = `<div style="padding:12px;border-radius:10px;border:1px solid ${erro ? '#fecaca' : '#bfdbfe'};background:${erro ? '#fff5f5' : '#eff6ff'};color:${erro ? '#991b1b' : '#1e3a8a'}">${texto}</div>`;
  }

  function atribuir(id, valor) {
    const el = document.getElementById(id);
    if (el && valor !== null && valor !== undefined) el.value = valor;
  }

  function marcarRadio(nome, valor) {
    if (valor === null || valor === undefined) return;
    let esperado = String(valor).toLowerCase();
    if (esperado === 'true') esperado = 'sim';
    if (esperado === 'false') esperado = 'nao';
    document.querySelectorAll(`input[name="${nome}"]`).forEach((radio) => {
      radio.checked = radio.value.toLowerCase() === esperado;
    });
  }

  function selecionarMultiplos(id, valor) {
    const select = document.getElementById(id);
    if (!select || !valor) return;
    const valores = Array.isArray(valor) ? valor : String(valor).split(',').map((item) => item.trim());
    Array.from(select.options).forEach((option) => { option.selected = valores.includes(option.value); });
  }

  const valorRadio = (nome) => document.querySelector(`input[name="${nome}"]:checked`)?.value || null;
  const valoresMultiplos = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const lista = Array.from(el.selectedOptions).map((option) => option.value);
    return lista.length ? lista.join(', ') : null;
  };

  function atualizarCondicionais() {
    if (campoCausa) campoCausa.style.display = selectNatureza?.value === 'Adquirida' ? 'block' : 'none';
    if (campoMedicamento) campoMedicamento.style.display = valorRadio('usa_medicamento') === 'sim' ? 'block' : 'none';
  }

  selectNatureza?.addEventListener('change', atualizarCondicionais);
  document.querySelectorAll('input[name="usa_medicamento"]').forEach((radio) => radio.addEventListener('change', atualizarCondicionais));

  async function carregar() {
    try {
      const { data: saude, error } = await supabase
        .from('saude_autonomia')
        .select('*')
        .eq('atleta_id', athlete.id)
        .maybeSingle();
      if (error) throw error;

      if (!saude) {
        status(`<strong>${athlete.nome_completo}</strong>, estas informações serão vinculadas automaticamente ao seu cadastro.`);
        atualizarCondicionais();
        return;
      }

      registroId = saude.id || null;
      ['tipo_deficiencia','cid_deficiencia','natureza_deficiencia','causa_deficiencia','detalhes_medicamento_horarios','possui_alergias','mecanismo_comunicacao','nivel_compreensao','interacao_social','autonomia_higiene','autonomia_alimentacao','restricao_alimentar','tipo_sanguineo'].forEach((id) => atribuir(id, saude[id]));
      marcarRadio('usa_medicamento', saude.usa_medicamento);
      marcarRadio('possui_dificuldade_fala', saude.possui_dificuldade_fala);
      marcarRadio('capacidade_transmitir_recados', saude.capacidade_transmitir_recados);
      marcarRadio('autonomia_mobilidade', saude.autonomia_mobilidade);
      selecionarMultiplos('dispositivos_tecnologicos', saude.dispositivos_tecnologicos);
      selecionarMultiplos('suportes_locomocao', saude.suportes_locomocao);
      atualizarCondicionais();
      status(`<strong>${athlete.nome_completo}</strong>, suas informações de saúde já cadastradas foram carregadas para atualização.`);
    } catch (error) {
      console.error('Erro ao carregar saúde:', error);
      status('Não foi possível carregar suas informações de saúde.', true);
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const usaMed = valorRadio('usa_medicamento');
    const dificuldade = valorRadio('possui_dificuldade_fala');
    const dados = {
      atleta_id: athlete.id,
      tipo_deficiencia: document.getElementById('tipo_deficiencia')?.value || null,
      cid_deficiencia: document.getElementById('cid_deficiencia')?.value.trim() || null,
      natureza_deficiencia: document.getElementById('natureza_deficiencia')?.value || null,
      causa_deficiencia: document.getElementById('causa_deficiencia')?.value.trim() || null,
      usa_medicamento: usaMed === 'sim' ? true : usaMed === 'nao' ? false : null,
      detalhes_medicamento_horarios: document.getElementById('detalhes_medicamento_horarios')?.value.trim() || null,
      possui_alergias: document.getElementById('possui_alergias')?.value.trim() || null,
      possui_dificuldade_fala: dificuldade === 'sim' ? true : dificuldade === 'nao' ? false : null,
      mecanismo_comunicacao: document.getElementById('mecanismo_comunicacao')?.value || null,
      nivel_compreensao: document.getElementById('nivel_compreensao')?.value || null,
      interacao_social: document.getElementById('interacao_social')?.value || null,
      capacidade_transmitir_recados: valorRadio('capacidade_transmitir_recados'),
      dispositivos_tecnologicos: valoresMultiplos('dispositivos_tecnologicos'),
      autonomia_mobilidade: valorRadio('autonomia_mobilidade'),
      suportes_locomocao: valoresMultiplos('suportes_locomocao'),
      autonomia_higiene: document.getElementById('autonomia_higiene')?.value || null,
      autonomia_alimentacao: document.getElementById('autonomia_alimentacao')?.value || null,
      restricao_alimentar: document.getElementById('restricao_alimentar')?.value.trim() || null,
      tipo_sanguineo: document.getElementById('tipo_sanguineo')?.value || null
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Salvando dados...';
    submitStatus.style.display = 'block';
    submitStatus.textContent = 'Salvando informações de saúde...';

    try {
      const resposta = registroId
        ? await supabase.from('saude_autonomia').update(dados).eq('id', registroId).select().maybeSingle()
        : await supabase.from('saude_autonomia').insert([dados]).select().maybeSingle();
      if (resposta.error) throw resposta.error;
      registroId = resposta.data?.id || registroId;
      submitStatus.style.background = '#d1e7dd';
      submitStatus.style.color = '#0f5132';
      submitStatus.textContent = '✓ Informações de saúde salvas com sucesso!';
      window.location.replace('../home.html');
    } catch (error) {
      console.error('Erro ao salvar saúde:', error);
      submitStatus.style.background = '#f8d7da';
      submitStatus.style.color = '#842029';
      submitStatus.textContent = `Erro ao salvar: ${error.message || 'tente novamente.'}`;
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Salvar Informações de Saúde';
    }
  });

  await carregar();
});
