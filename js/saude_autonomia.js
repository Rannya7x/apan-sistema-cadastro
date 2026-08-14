// =============================================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================================
const SUPABASE_URL = 'https://jaslvoxljchhhkompelu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphc2x2b3hsamNoaGhrb21wZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDY0MDAsImV4cCI6MjA5NzMyMjQwMH0.MoxG26k7LvtGm5hWvoA3YROXh6vJ3LARs9ndjF98hpc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", function () {

  // Elementos do DOM
  var inputCpfConsulta = document.getElementById("cpf-consulta");
  var btnBuscar = document.getElementById("btn-buscar");
  var divResultadoBusca = document.getElementById("resultado-busca");

  var form = document.getElementById("form-saude");
  var btnSubmit = form ? form.querySelector(".btn-submit") : null;
  var submitStatus = document.getElementById("submit-status");

  // Elementos condicionais da tela
  var selectNatureza = document.getElementById("natureza_deficiencia");
  var campoCausa = document.getElementById("campo-causa");
  var campoMedicamento = document.getElementById("campo-medicamento");

  // Armazena o ID do atleta encontrado
  var atletaEncontradoId = null;

  // =============================================================
  // 0. COMPORTAMENTOS CONDICIONAIS (EXIBIÇÃO DE CAMPOS)
  // =============================================================
  if (selectNatureza) {
    selectNatureza.addEventListener("change", function () {
      if (this.value === "Adquirida") {
        if (campoCausa) campoCausa.style.display = "block";
      } else {
        if (campoCausa) {
          campoCausa.style.display = "none";
          var inputCausa = document.getElementById("causa_deficiencia");
          if (inputCausa) inputCausa.value = "";
        }
      }
    });
  }

  // Monitorar rádio de medicamento (Sim/Não)
  var radiosUsaMedicamento = document.querySelectorAll("input[name='usa_medicamento']");
  radiosUsaMedicamento.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (this.value === "sim") {
        if (campoMedicamento) campoMedicamento.style.display = "block";
      } else {
        if (campoMedicamento) {
          campoMedicamento.style.display = "none";
          var txtMed = document.getElementById("detalhes_medicamento_horarios");
          if (txtMed) txtMed.value = "";
        }
      }
    });
  });

  // =============================================================
  // 1. MÁSCARA DO CPF
  // =============================================================
  if (inputCpfConsulta) {
    inputCpfConsulta.addEventListener("input", function (e) {
      var value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      e.target.value = value;

      if (value.length < 14 && atletaEncontradoId) {
        limparFormularioSaude();
        if (divResultadoBusca) divResultadoBusca.style.display = "none";
      }
    });
  }

  // =============================================================
  // FUNÇÃO PARA LIMPAR FORMULÁRIO E RESETAR ESTADOS
  // =============================================================
  function limparFormularioSaude() {
    var cpfDigitado = inputCpfConsulta ? inputCpfConsulta.value : "";
    
    if (form) form.reset();
    if (inputCpfConsulta) inputCpfConsulta.value = cpfDigitado;
    
    atletaEncontradoId = null;

    if (campoCausa) campoCausa.style.display = "none";
    if (campoMedicamento) campoMedicamento.style.display = "none";

    if (submitStatus) {
      submitStatus.style.display = "none";
      submitStatus.innerHTML = "";
    }
  }

  // =============================================================
  // 2. BUSCA DO ATLETA POR CPF
  // =============================================================
  async function buscarAtleta() {
    var cpfLimpo = inputCpfConsulta.value.replace(/\D/g, "");

    if (cpfLimpo.length !== 11) {
      divResultadoBusca.style.display = "block";
      divResultadoBusca.innerHTML = '<div style="background: #f8d7da; border: 1px solid #f5c2c7; color: #842029; padding: 12px; border-radius: 10px; font-size: 14px;">Por favor, digite um CPF válido com 11 dígitos.</div>';
      limparFormularioSaude();
      return;
    }

    limparFormularioSaude();

    btnBuscar.disabled = true;
    btnBuscar.innerText = "🔍 Buscando...";
    divResultadoBusca.style.display = "block";
    divResultadoBusca.innerHTML = '<div style="color: #6c757d; font-size: 14px;">Consultando sistema...</div>';

    try {
      // 1. Busca Atleta na tabela 'atletas'
      var response = await supabaseClient
        .from("atletas")
        .select("id, nome_completo")
        .eq("cpf", cpfLimpo)
        .maybeSingle();

      if (response.error) throw response.error;

      var atleta = response.data;

      if (atleta) {
        atletaEncontradoId = atleta.id;

        // 2. Consulta tabela 'saude_autonomia'
        var saudeResp = await supabaseClient
          .from("saude_autonomia")
          .select("*")
          .eq("atleta_id", atleta.id)
          .maybeSingle();

        var saude = saudeResp.data;

        if (saude) {
          // Preenche campos comuns de texto e select
          atribuirValor("tipo_deficiencia", saude.tipo_deficiencia);
          atribuirValor("cid_deficiencia", saude.cid_deficiencia);
          atribuirValor("natureza_deficiencia", saude.natureza_deficiencia);
          atribuirValor("causa_deficiencia", saude.causa_deficiencia);
          atribuirValor("detalhes_medicamento_horarios", saude.detalhes_medicamento_horarios);
          atribuirValor("possui_alergias", saude.possui_alergias);
          atribuirValor("mecanismo_comunicacao", saude.mecanismo_comunicacao);
          atribuirValor("nivel_compreensao", saude.nivel_compreensao);
          atribuirValor("interacao_social", saude.interacao_social);
          atribuirValor("capacidade_transmitir_recados", saude.capacidade_transmitir_recados);
          atribuirValor("autonomia_higiene", saude.autonomia_higiene);
          atribuirValor("autonomia_alimentacao", saude.autonomia_alimentacao);
          atribuirValor("restricao_alimentar", saude.restricao_alimentar);
          atribuirValor("tipo_sanguineo", saude.tipo_sanguineo);

          // Campos Booleanos (Radios Sim/Não)
          marcarRadio("usa_medicamento", saude.usa_medicamento);
          marcarRadio("possui_dificuldade_fala", saude.possui_dificuldade_fala);

          // Autonomia Mobilidade (Radio Group)
          marcarRadio("autonomia_mobilidade", saude.autonomia_mobilidade);

          // Selects Múltiplos (Dispositivos / Suportes)
          selecionarMultiplos("dispositivos_tecnologicos", saude.dispositivos_tecnologicos);
          selecionarMultiplos("suportes_locomocao", saude.suportes_locomocao);

          // Ajusta visibilidade condicional baseada nos dados salvos
          if (saude.natureza_deficiencia === "Adquirida" && campoCausa) {
            campoCausa.style.display = "block";
          }
          if (saude.usa_medicamento === true && campoMedicamento) {
            campoMedicamento.style.display = "block";
          }

          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Dados de saúde já cadastrados carregados para atualização.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';

        } else {
          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Nenhum registro de saúde cadastrado. Preencha abaixo.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';
        }

        var btnLimparBusca = document.getElementById("btn-limpar-busca");
        if (btnLimparBusca) {
          btnLimparBusca.addEventListener("click", function () {
            if (inputCpfConsulta) inputCpfConsulta.value = "";
            limparFormularioSaude();
            divResultadoBusca.style.display = "none";
          });
        }

      } else {
        limparFormularioSaude();
        divResultadoBusca.innerHTML = 
          '<div style="background: #fff5f5; border: 1px solid #fcc; color: #c92a2a; padding: 14px; border-radius: 10px; font-size: 14px; text-align: center;">' +
            '<p style="margin-bottom: 8px;"><strong>⚠️ Atleta não encontrado.</strong> Verifique se digitou o CPF corretamente.</p>' +
            '<a href="inscricao.html" style="display: inline-block; background: #1a73e8; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">' +
              'Ir para a Tela de Inscrição' +
            '</a>' +
          '</div>';
      }

    } catch (err) {
      console.error("Erro ao buscar atleta:", err);
      divResultadoBusca.innerHTML = '<div style="background: #f8d7da; border: 1px solid #f5c2c7; color: #842029; padding: 12px; border-radius: 10px; font-size: 14px;">Erro ao realizar a busca. Tente novamente.</div>';
      limparFormularioSaude();
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.innerText = "🔍 Buscar Atleta";
    }
  }

  if (btnBuscar) {
    btnBuscar.addEventListener("click", buscarAtleta);
  }

  // =============================================================
  // FUNÇÕES AUXILIARES DE PREENCHIMENTO
  // =============================================================
  function atribuirValor(id, valor) {
    var el = document.getElementById(id);
    if (el && valor !== null && valor !== undefined) {
      el.value = valor;
    }
  }

  function marcarRadio(nomeGrupo, valor) {
    if (valor === null || valor === undefined) return;
    var valorStr = String(valor).toLowerCase();
    // Ajusta para booleanos convertidos em texto "true"/"false" se vierem do banco
    if (valorStr === "true") valorStr = "sim";
    if (valorStr === "false") valorStr = "nao";

    var radios = document.querySelectorAll("input[name='" + nomeGrupo + "']");
    radios.forEach(function (r) {
      if (r.value.toLowerCase() === valorStr) {
        r.checked = true;
      }
    });
  }

  function selecionarMultiplos(idSelect, valoresSalvos) {
    var selectEl = document.getElementById(idSelect);
    if (!selectEl || !valoresSalvos) return;
    
    // Suporta se salvo como string separada por vírgula ou texto simples
    var lista = typeof valoresSalvos === "string" ? valoresSalvos.split(",").map(function(s){ return s.trim(); }) : [valoresSalvos];

    for (var i = 0; i < selectEl.options.length; i++) {
      if (lista.includes(selectEl.options[i].value)) {
        selectEl.options[i].selected = true;
      }
    }
  }

  function obterValorRadio(nomeGrupo) {
    var selecionado = document.querySelector("input[name='" + nomeGrupo + "']:checked");
    return selecionado ? selecionado.value : null;
  }

  function obterValoresMultiplos(idSelect) {
    var selectEl = document.getElementById(idSelect);
    if (!selectEl) return null;
    var selecionados = [];
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].selected) {
        selecionados.push(selectEl.options[i].value);
      }
    }
    return selecionados.length > 0 ? selecionados.join(", ") : null;
  }

  // =============================================================
  // 3. ENVIO DO FORMULÁRIO E SALVAMENTO NO BANCO
  // =============================================================
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!atletaEncontradoId) {
        await buscarAtleta();
        if (!atletaEncontradoId) {
          alert("Atenção: É necessário pesquisar um atleta cadastrado via CPF antes de enviar os dados.");
          return;
        }
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Salvando dados...";
      }

      if (submitStatus) {
        submitStatus.style.display = "block";
        submitStatus.style.background = "#e2e3e5";
        submitStatus.style.color = "#383d41";
        submitStatus.innerText = "Salvando informações de saúde...";
      }

      try {
        // Converte valores de radio Sim/Não para booleano conforme a tabela do Supabase
        var usaMedStr = obterValorRadio("usa_medicamento");
        var usaMedBool = usaMedStr === "sim" ? true : (usaMedStr === "nao" ? false : null);

        var difFalaStr = obterValorRadio("possui_dificuldade_fala");
        var difFalaBool = difFalaStr === "sim" ? true : (difFalaStr === "nao" ? false : null);

        // Monta o objeto com exatidão baseada nas colunas da tabela 'saude_autonomia'
        var dadosSaude = {
          atleta_id: atletaEncontradoId,
          tipo_deficiencia: document.getElementById("tipo_deficiencia")?.value || null,
          cid_deficiencia: document.getElementById("cid_deficiencia")?.value.trim() || null,
          natureza_deficiencia: document.getElementById("natureza_deficiencia")?.value || null,
          causa_deficiencia: document.getElementById("causa_deficiencia")?.value.trim() || null,
          usa_medicamento: usaMedBool,
          detalhes_medicamento_horarios: document.getElementById("detalhes_medicamento_horarios")?.value.trim() || null,
          possui_alergias: document.getElementById("possui_alergias")?.value.trim() || null,
          possui_dificuldade_fala: difFalaBool,
          mecanismo_comunicacao: document.getElementById("mecanismo_comunicacao")?.value || null,
          nivel_compreensao: document.getElementById("nivel_compreensao")?.value || null,
          interacao_social: document.getElementById("interacao_social")?.value || null,
          capacidade_transmitir_recados: obterValorRadio("capacidade_transmitir_recados"),
          dispositivos_tecnologicos: obterValoresMultiplos("dispositivos_tecnologicos"),
          autonomia_mobilidade: obterValorRadio("autonomia_mobilidade"),
          suportes_locomocao: obterValoresMultiplos("suportes_locomocao"),
          autonomia_higiene: document.getElementById("autonomia_higiene")?.value || null,
          autonomia_alimentacao: document.getElementById("autonomia_alimentacao")?.value || null,
          restricao_alimentar: document.getElementById("restricao_alimentar")?.value.trim() || null,
          tipo_sanguineo: document.getElementById("tipo_sanguineo")?.value || null
        };

        var response = await supabaseClient
          .from("saude_autonomia")
          .upsert([dadosSaude], { onConflict: 'atleta_id' });

        if (response.error) throw response.error;

        if (submitStatus) {
          submitStatus.style.background = "#d1e7dd";
          submitStatus.style.color = "#0f5132";
          submitStatus.style.border = "1px solid #badbcc";
          submitStatus.innerText = "✓ Informações de saúde salvas com sucesso!";
        }

        alert("Informações de saúde salvas com sucesso!");

        // Limpa a busca para permitir novo cadastro
        if (inputCpfConsulta) inputCpfConsulta.value = "";
        limparFormularioSaude();
        if (divResultadoBusca) divResultadoBusca.style.display = "none";

      } catch (err) {
        console.error("Erro ao salvar saúde e autonomia:", err);
        if (submitStatus) {
          submitStatus.style.background = "#f8d7da";
          submitStatus.style.color = "#842029";
          submitStatus.style.border = "1px solid #f5c2c7";
          submitStatus.innerText = "Erro ao salvar: " + (err.message || "Tente novamente.");
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = "Salvar Informações de Saúde";
        }
      }
    });
  }

});