import { supabase } from './src/lib/supabase.js';
import { getAccessContext, formatCpf } from './src/lib/auth.js';

let access = null;
let atletasCache = [];
const AVATAR_PADRAO = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function formatarData(dataIso) {
  if (!dataIso) return 'Não informada';
  const partes = String(dataIso).split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : esc(dataIso);
}

function formatarSimNao(valor) {
  if (valor === true || valor === 'sim' || valor === 'Sim') return 'Sim';
  if (valor === false || valor === 'nao' || valor === 'Não') return 'Não';
  return valor ? esc(valor) : 'Não informado';
}

function rel(value) {
  if (Array.isArray(value)) return value[0] || {};
  return value || {};
}

function mostrarErro(message) {
  const area = document.getElementById('area-erro');
  if (!area) return;
  area.style.display = 'block';
  area.textContent = message;
}

function setLoading(loading) {
  document.getElementById('loading-indicator').style.display = loading ? 'block' : 'none';
  document.getElementById('area-resultados').style.display = 'block';
}

async function carregarAtletas() {
  setLoading(true);
  document.getElementById('area-erro').style.display = 'none';

  let query = supabase
    .from('atletas')
    .select(`
      *,
      socioeconomico (*),
      documentos_atletas (*),
      saude_autonomia (*),
      uniformes_atletas (*)
    `)
    .order('nome_completo');

  if (access.role === 'athlete') {
    query = query.eq('auth_user_id', access.user.id);
  }

  const { data, error } = await query;
  setLoading(false);

  if (error) {
    console.error('Erro ao consultar inscrições:', error);
    mostrarErro(`Erro ao consultar dados: ${error.message}`);
    return;
  }

  atletasCache = data || [];
  if (access.role === 'athlete') {
    if (!atletasCache[0]) {
      mostrarErro('Não foi encontrado um cadastro vinculado à sua sessão.');
      return;
    }
    exibirDetalhesAtleta(atletasCache[0]);
  } else {
    exibirListaAtletas(atletasCache);
  }
}

function exibirListaAtletas(atletas) {
  const conteudo = document.getElementById('resultado-conteudo');
  if (!atletas.length) {
    conteudo.innerHTML = '<div class="mensagem-info" style="text-align:center;padding:30px;color:#6c757d;">Nenhum atleta encontrado.</div>';
    return;
  }

  conteudo.innerHTML = `
    <div class="lista-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;">
      <span style="font-weight:600;color:#495057;">${atletas.length} atleta(s)</span>
      <button id="btn-recarregar" class="btn-pequeno" style="padding:7px 12px;cursor:pointer;">🔄 Recarregar</button>
    </div>
    ${atletas.map((atleta) => {
      const doc = rel(atleta.documentos_atletas);
      const foto = esc((doc.foto_url || atleta.foto_url || AVATAR_PADRAO).trim());
      return `
        <article class="card-lista" style="background:#fff;border:1px solid #e9ecef;border-radius:12px;padding:18px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.04);">
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:64px;height:64px;min-width:64px;border-radius:50%;overflow:hidden;border:2px solid #1a73e8;background:#e7f3ff;">
              <img src="${foto}" alt="Atleta" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div style="flex:1;min-width:0;">
              <strong style="font-size:18px;color:#1a73e8;">${esc(atleta.nome_completo)}</strong>
              <div style="display:flex;gap:16px;margin-top:7px;font-size:14px;color:#6c757d;flex-wrap:wrap;">
                <span><strong>CPF:</strong> ${esc(formatCpf(atleta.cpf))}</span>
                <span><strong>Módulo:</strong> ${esc(atleta.modulo || 'Não informado')}</span>
                <span><strong>Nascimento:</strong> ${formatarData(atleta.data_nascimento)}</span>
              </div>
            </div>
          </div>
          <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;">
            <button class="btn-detalhes" data-id="${esc(atleta.id)}" style="background:#1a73e8;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">📄 Ver detalhes</button>
            <button class="btn-editar" data-id="${esc(atleta.id)}" style="background:#f59e0b;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">✏️ Editar</button>
            <button class="btn-excluir" data-id="${esc(atleta.id)}" style="background:#dc2626;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">🗑️ Apagar</button>
          </div>
        </article>`;
    }).join('')}
  `;

  conteudo.querySelectorAll('.btn-detalhes').forEach((btn) => btn.addEventListener('click', () => {
    const atleta = atletasCache.find((item) => String(item.id) === btn.dataset.id);
    if (atleta) exibirDetalhesAtleta(atleta);
  }));
  conteudo.querySelectorAll('.btn-editar').forEach((btn) => btn.addEventListener('click', () => {
    const atleta = atletasCache.find((item) => String(item.id) === btn.dataset.id);
    if (atleta) exibirFormularioEdicao(atleta);
  }));
  conteudo.querySelectorAll('.btn-excluir').forEach((btn) => btn.addEventListener('click', () => excluirAtleta(btn.dataset.id)));
  document.getElementById('btn-recarregar')?.addEventListener('click', carregarAtletas);
}

function gerarLinkDocumento(titulo, url) {
  if (!url) return `<div style="padding:10px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;font-size:13px;color:#adb5bd;"><strong>${esc(titulo)}:</strong><br>Não enviado</div>`;
  return `<div style="padding:10px;background:#e7f3ff;border:1px solid #c5d5ea;border-radius:8px;font-size:13px;"><strong style="color:#0c4a6e;">${esc(titulo)}:</strong><br><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;font-weight:600;text-decoration:underline;">🔗 Abrir arquivo</a></div>`;
}

function statusTermo(valor) {
  if (valor === true) return '<span style="color:#198754;font-weight:700;">✓ Aceito</span>';
  if (valor === false) return '<span style="color:#dc3545;font-weight:700;">✕ Não aceito</span>';
  return '<span style="color:#6c757d;font-weight:600;">Não registrado</span>';
}

function exibirDetalhesAtleta(atleta) {
  const conteudo = document.getElementById('resultado-conteudo');
  const socio = rel(atleta.socioeconomico);
  const doc = rel(atleta.documentos_atletas);
  const saude = rel(atleta.saude_autonomia);
  const uniforme = rel(atleta.uniformes_atletas);
  const foto = esc((doc.foto_url || atleta.foto_url || AVATAR_PADRAO).trim());
  const roleActions = access.role === 'admin' ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <button id="btn-voltar-lista" style="background:#f8f9fa;border:1px solid #dee2e6;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">← Voltar à lista</button>
      <button id="btn-editar-detalhe" style="background:#f59e0b;color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">✏️ Editar cadastro</button>
      <button id="btn-excluir-detalhe" style="background:#dc2626;color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">🗑️ Apagar cadastro</button>
    </div>` : `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <button id="btn-editar-detalhe" style="background:#f59e0b;color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;">✏️ Editar minhas informações</button>
    </div>`;

  conteudo.innerHTML = `${roleActions}
    <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #e9ecef;box-shadow:0 4px 12px rgba(0,0,0,.05);">
      <div style="display:flex;align-items:center;gap:20px;border-bottom:1px solid #eee;padding-bottom:20px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="width:100px;height:100px;min-width:100px;border-radius:50%;overflow:hidden;border:3px solid #1a73e8;background:#e7f3ff;"><img src="${foto}" alt="Perfil do atleta" style="width:100%;height:100%;object-fit:cover;"></div>
        <div><h2 style="margin:0;font-size:24px;color:#1a73e8;">${esc(atleta.nome_completo)}</h2><p style="margin:4px 0 0;color:#6c757d;font-size:14px;">CPF: <strong>${esc(formatCpf(atleta.cpf))}</strong> | Módulo: <strong>${esc(atleta.modulo || 'Não informado')}</strong></p></div>
      </div>

      <section style="margin-bottom:24px;"><h3 style="color:#1a73e8;font-size:16px;border-bottom:2px solid #e7f3ff;padding-bottom:6px;margin-bottom:12px;">📋 Dados pessoais e contato</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:14px;">
        <div><strong>Data de nascimento:</strong> ${formatarData(atleta.data_nascimento)}</div><div><strong>E-mail:</strong> ${esc(atleta.email || 'Não informado')}</div><div><strong>WhatsApp:</strong> ${esc(atleta.whatsapp || 'Não informado')}</div><div><strong>Responsável:</strong> ${esc(atleta.nome_responsavel || 'Não necessário')}</div><div><strong>Deficiência:</strong> ${esc(atleta.tipo_deficiencia || 'Não informada')}</div><div><strong>Equipamento auxiliar:</strong> ${esc(atleta.qual_equipamento || 'Não informado')}</div>
      </div></section>

      <section style="margin-bottom:24px;"><h3 style="color:#1a73e8;font-size:16px;border-bottom:2px solid #e7f3ff;padding-bottom:6px;margin-bottom:12px;">🩺 Saúde e autonomia</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:14px;">
        <div><strong>Tipo de deficiência:</strong> ${esc(saude.tipo_deficiencia || 'Não informado')}</div><div><strong>CID:</strong> ${esc(saude.cid_deficiencia || 'Não informado')}</div><div><strong>Natureza:</strong> ${esc(saude.natureza_deficiencia || 'Não informada')}</div><div><strong>Usa medicamento:</strong> ${formatarSimNao(saude.usa_medicamento)}</div><div><strong>Alergias:</strong> ${esc(saude.possui_alergias || 'Nenhuma informada')}</div><div><strong>Tipo sanguíneo:</strong> ${esc(saude.tipo_sanguineo || 'Não informado')}</div><div><strong>Autonomia mobilidade:</strong> ${esc(saude.autonomia_mobilidade || 'Não informada')}</div><div><strong>Restrição alimentar:</strong> ${esc(saude.restricao_alimentar || 'Nenhuma')}</div>
      </div></section>

      <section style="margin-bottom:24px;"><h3 style="color:#1a73e8;font-size:16px;border-bottom:2px solid #e7f3ff;padding-bottom:6px;margin-bottom:12px;">🏠 Ficha socioeconômica</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:14px;">
        <div><strong>RG:</strong> ${esc(socio.rg_numero || 'Não cadastrado')}</div><div><strong>Gênero:</strong> ${esc(socio.genero || 'Não informado')}</div><div><strong>Nome da mãe:</strong> ${esc(socio.nome_mae || 'Não informado')}</div><div><strong>Contato emergência:</strong> ${esc(socio.contato_emergencia || 'Não informado')}</div><div><strong>Escolaridade:</strong> ${esc(socio.escolaridade_do_atleta || 'Não informada')}</div><div><strong>Renda familiar:</strong> ${esc(socio.renda_familiar_mensal || 'Não informada')}</div><div><strong>CadÚnico:</strong> ${formatarSimNao(socio.possui_cadunico)}</div><div><strong>NIS:</strong> ${esc(socio.numero_nis || 'Não informado')}</div>
      </div></section>

      <section style="margin-bottom:24px;"><h3 style="color:#1a73e8;font-size:16px;border-bottom:2px solid #e7f3ff;padding-bottom:6px;margin-bottom:12px;">👕 Uniforme</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;font-size:14px;">
        <div><strong>Camiseta:</strong> ${esc(uniforme.tamanho_camiseta || 'Não informado')}</div><div><strong>Short:</strong> ${esc(uniforme.tamanho_short || 'Não informado')}</div><div><strong>Tênis:</strong> ${esc(uniforme.tamanho_tenis || 'Não informado')}</div><div><strong>Sapatilha:</strong> ${esc(uniforme.tamanho_sapatilha || 'Não informado')}</div><div style="grid-column:1/-1;"><strong>Observação:</strong> ${esc(uniforme.observacao || 'Nenhuma')}</div>
      </div></section>

      <section style="margin-bottom:24px;"><h3 style="color:#1a73e8;font-size:16px;border-bottom:2px solid #e7f3ff;padding-bottom:6px;margin-bottom:12px;">✅ Termos e Autorizações</h3><div style="display:grid;gap:12px;font-size:14px;">
        <div style="padding:12px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;"><span>Autorização de uso de imagem para fins institucionais e de divulgação esportiva.</span>${statusTermo(doc.termo_imagem)}</div>
        <div style="padding:12px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;"><span>Ciência do Código de Conduta para grupos oficiais do WhatsApp.</span>${statusTermo(doc.termo_whatsapp)}</div>
        <div style="padding:12px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;"><span>Consentimento para tratamento de dados pessoais conforme LGPD e regulamentos da APAN e CBAt.</span>${statusTermo(doc.termo_lgpd)}</div>
      </div></section>

      <section><h3 style="color:#1a73e8;font-size:16px;border-bottom:2px solid #e7f3ff;padding-bottom:6px;margin-bottom:12px;">📁 Documentos</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
        ${gerarLinkDocumento('Foto', doc.foto_url || atleta.foto_url)}${gerarLinkDocumento('RG/CPF/CNH', doc.rg_cpf_url)}${gerarLinkDocumento('Comprovante de residência', doc.comprovante_residencia_url)}${gerarLinkDocumento('Cartão SUS', doc.cartao_sus_url)}${gerarLinkDocumento('Laudo médico', doc.laudo_medico_url)}
      </div></section>
    </div>`;

  document.getElementById('btn-voltar-lista')?.addEventListener('click', () => exibirListaAtletas(atletasCache));
  document.getElementById('btn-editar-detalhe')?.addEventListener('click', () => exibirFormularioEdicao(atleta));
  document.getElementById('btn-excluir-detalhe')?.addEventListener('click', () => excluirAtleta(atleta.id));
}

function exibirFormularioEdicao(atleta) {
  const podeEditar = access.role === 'admin' || (access.role === 'athlete' && String(atleta.auth_user_id) === String(access.user.id));
  if (!podeEditar) return;
  const conteudo = document.getElementById('resultado-conteudo');
  conteudo.innerHTML = `
    <button id="btn-cancelar-edicao" style="background:#f8f9fa;border:1px solid #dee2e6;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;margin-bottom:16px;">← Cancelar</button>
    <form id="form-edicao-admin" style="background:#fff;border:1px solid #e9ecef;border-radius:14px;padding:22px;display:grid;gap:14px;">
      <h2 style="margin:0;color:#1a73e8;">${access.role === 'admin' ? 'Editar cadastro' : 'Editar minhas informações'}</h2>
      <div class="form-group"><label>Nome completo</label><input id="edit-nome" value="${esc(atleta.nome_completo)}" required></div>
      <div class="form-group"><label>CPF</label><input value="${esc(formatCpf(atleta.cpf))}" disabled><small>O CPF é a credencial de acesso e não é alterado nesta tela.</small></div>
      <div class="form-group"><label>Data de nascimento</label><input id="edit-nascimento" type="date" value="${esc(atleta.data_nascimento || '')}" required></div>
      <div class="form-group"><label>Nome do responsável</label><input id="edit-responsavel" value="${esc(atleta.nome_responsavel || '')}"></div>
      <div class="form-group"><label>E-mail de contato</label><input id="edit-email" type="email" value="${esc(atleta.email || '')}"></div>
      <div class="form-group"><label>WhatsApp</label><input id="edit-whatsapp" value="${esc(atleta.whatsapp || '')}"></div>
      <div class="form-group"><label>Módulo</label><select id="edit-modulo"><option value="preinscricao">Pré-Inscrição APAN</option><option value="atletismo">Iniciação ao Atletismo</option><option value="ambos">Ambos</option></select></div>
      <div class="form-group"><label>Possui deficiência?</label><select id="edit-deficiencia"><option value="nao">Não</option><option value="sim">Sim</option></select></div>
      <div class="form-group"><label>Tipo de deficiência</label><input id="edit-tipo-deficiencia" value="${esc(atleta.tipo_deficiencia || '')}"></div>
      <div class="form-group"><label>Necessita equipamento auxiliar?</label><select id="edit-equipamentos"><option value="nao">Não</option><option value="sim">Sim</option></select></div>
      <div class="form-group"><label>Qual equipamento</label><input id="edit-qual-equipamento" value="${esc(atleta.qual_equipamento || '')}"></div>
      <button type="submit" class="btn-principal">Salvar alterações</button>
      <div id="status-edicao" style="display:none;padding:10px;border-radius:8px;"></div>
    </form>`;

  document.getElementById('edit-modulo').value = atleta.modulo || 'preinscricao';
  document.getElementById('edit-deficiencia').value = atleta.possui_deficiencia || 'nao';
  document.getElementById('edit-equipamentos').value = atleta.possui_equipamentos || 'nao';
  document.getElementById('btn-cancelar-edicao').addEventListener('click', () => {
    if (access.role === 'admin') exibirListaAtletas(atletasCache);
    else exibirDetalhesAtleta(atleta);
  });

  document.getElementById('form-edicao-admin').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    const status = document.getElementById('status-edicao');
    submit.disabled = true;
    submit.textContent = 'Salvando...';
    try {
      const changes = {
        nome_completo: document.getElementById('edit-nome').value.trim(),
        data_nascimento: document.getElementById('edit-nascimento').value,
        nome_responsavel: document.getElementById('edit-responsavel').value.trim() || null,
        email: document.getElementById('edit-email').value.trim() || null,
        whatsapp: document.getElementById('edit-whatsapp').value.trim() || null,
        modulo: document.getElementById('edit-modulo').value,
        possui_deficiencia: document.getElementById('edit-deficiencia').value,
        tipo_deficiencia: document.getElementById('edit-tipo-deficiencia').value.trim() || null,
        possui_equipamentos: document.getElementById('edit-equipamentos').value,
        qual_equipamento: document.getElementById('edit-qual-equipamento').value.trim() || null
      };
      let updateQuery = supabase.from('atletas').update(changes).eq('id', atleta.id);
      if (access.role === 'athlete') updateQuery = updateQuery.eq('auth_user_id', access.user.id);
      const { error } = await updateQuery;
      if (error) throw error;
      status.style.display = 'block';
      status.style.background = '#d1e7dd';
      status.style.color = '#0f5132';
      status.textContent = '✓ Cadastro atualizado.';
      await carregarAtletas();
    } catch (error) {
      console.error('Erro ao editar atleta:', error);
      status.style.display = 'block';
      status.style.background = '#f8d7da';
      status.style.color = '#842029';
      status.textContent = `Erro ao salvar: ${error.message || 'tente novamente.'}`;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Salvar alterações';
    }
  });
}

async function excluirAtleta(atletaId) {
  if (access.role !== 'admin') return;

  const atleta = atletasCache.find(
    (item) => String(item.id) === String(atletaId)
  );

  if (!atleta) return;

  const ok = window.confirm(
    `Apagar definitivamente o cadastro de ${atleta.nome_completo}? Esta ação não pode ser desfeita.`
  );

  if (!ok) return;

  try {
    const { data, error } = await supabase.functions.invoke(
      'admin-delete-athlete',
      {
        body: {
          athleteId: atletaId
        }
      }
    );

    if (error) throw error;

    if (!data?.ok) {
      throw new Error(
        data?.message || 'Não foi possível apagar o cadastro.'
      );
    }

    await carregarAtletas();

  } catch (error) {
    console.error('Erro ao excluir atleta:', error);

    mostrarErro(
      `Não foi possível apagar o cadastro: ${
        error.message || 'erro desconhecido'
      }`
    );
  }
}

function configurarBuscaAdmin() {
  const input = document.getElementById('cpf-consulta');
  const button = document.getElementById('btn-buscar');
  input.value = '';
  const filtrar = () => {
    const cpfBusca = String(input.value || '').replace(/\D/g, '');
    if (!cpfBusca) return exibirListaAtletas(atletasCache);
    const filtrados = atletasCache.filter((atleta) => String(atleta.cpf || '').replace(/\D/g, '').includes(cpfBusca));
    exibirListaAtletas(filtrados);
  };
  input.addEventListener('input', (event) => {
    let value = String(event.target.value).replace(/\D/g, '').slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    event.target.value = value;
  });
  button.addEventListener('click', filtrar);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') filtrar(); });
}

async function init() {
  access = await getAccessContext();
  if (!access.role) {
    window.location.replace('../index.html');
    return;
  }

  if (access.role === 'admin') {
    document.getElementById('area-busca').style.display = 'block';
    document.getElementById('btn-voltar-painel').href = '../admin.html';
    document.getElementById('texto-voltar').textContent = 'Voltar ao Painel Administrativo';
    document.getElementById('titulo-consulta').textContent = 'Consultar Inscrições';
    document.getElementById('consulta-subtitle').textContent = 'Consulte, edite ou apague cadastros de atletas.';
    configurarBuscaAdmin();
  } else {
    document.getElementById('area-busca').style.display = 'none';
    document.getElementById('titulo-consulta').textContent = 'Minha Inscrição';
    document.getElementById('consulta-subtitle').textContent = 'Dados vinculados à sua sessão de atleta.';
  }

  await carregarAtletas();
}

init().catch((error) => {
  console.error('Falha ao iniciar consulta:', error);
  mostrarErro('Não foi possível validar sua sessão.');
});
