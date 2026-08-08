// =============================================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================================
const SUPABASE_URL = 'https://jaslvoxljchhhkompelu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphc2x2b3hsamNoaGhrb21wZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDY0MDAsImV4cCI6MjA5NzMyMjQwMH0.MoxG26k7LvtGm5hWvoA3YROXh6vJ3LARs9ndjF98hpc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", function () {
  
  // Elementos do DOM
  var checkboxCadUnico = document.getElementById("possuiCadUnico");
  var nis = document.getElementById("numeroNis");
  var beneficio = document.getElementById("beneficioGoverno");
  var reqNis = document.getElementById("req-nis");
  var reqBeneficio = document.getElementById("req-beneficio");

  var inputCpfConsulta = document.getElementById("cpf-consulta");
  var btnBuscar = document.getElementById("btn-buscar");
  var divResultadoBusca = document.getElementById("resultado-busca");
  
  var form = document.getElementById("socio-form");
  var submitStatus = document.getElementById("submit-status");
  var btnEnviar = document.getElementById("btn-enviar");

  // Armazena o ID do atleta encontrado
  var atletaEncontradoId = null;

  // =============================================================
  // FUNÇÃO PARA LIMPAR O FORMULÁRIO COMPLETO E RESETAR ESTADOS
  // =============================================================
  function limparFormularioSocio() {
    var cpfDigitado = inputCpfConsulta ? inputCpfConsulta.value : "";
    
    form.reset();
    
    if (inputCpfConsulta) inputCpfConsulta.value = cpfDigitado;
    atletaEncontradoId = null;
    
    if (checkboxCadUnico) {
      checkboxCadUnico.checked = false;
      atualizarObrigatoriedade();
    }
    
    if (submitStatus) {
      submitStatus.textContent = "";
      submitStatus.className = "status-msg";
    }
  }

  // Helper para definir valor em inputs/selects de forma segura
  function setValor(id, valor) {
    var el = document.getElementById(id);
    if (el) {
      el.value = (valor !== null && valor !== undefined) ? valor : "";
    }
  }

  // =============================================================
  // 1. MÁSCARAS DE FORMATAÇÃO (VISUAL)
  // =============================================================
  
  // Máscara CPF
  if (inputCpfConsulta) {
    inputCpfConsulta.addEventListener("input", function (e) {
      var value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      e.target.value = value;
      
      if (value.length < 14 && atletaEncontradoId) {
        limparFormularioSocio();
        divResultadoBusca.style.display = "none";
      }
    });
  }

  // Máscara RG
  var inputRg = document.getElementById("rg");
  if (inputRg) {
    inputRg.addEventListener("input", function (e) {
      var value = e.target.value.replace(/[^0-9kK]/g, "");
      if (value.length > 9) value = value.slice(0, 9);
      
      if (value.length > 8) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})([\dxX])$/, "$1.$2.$3-$4");
      } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{3})(\d{0,3})$/, "$1.$2.$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,3})$/, "$1.$2");
      }
      
      e.target.value = value.toUpperCase();
    });
  }

  // Máscara Contato
  var inputEmergencia = document.getElementById("contatoEmergencia");
  if (inputEmergencia) {
    inputEmergencia.addEventListener("input", function (e) {
      var value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
      } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
      } else if (value.length > 0) {
        value = value.replace(/^(\d*)$/, "($1");
      }
      e.target.value = value;
    });
  }

  // =============================================================
  // 2. CONTROLE DE OBRIGATORIEDADE DO CADÚNICO
  // =============================================================
  function atualizarObrigatoriedade() {
    var marcado = checkboxCadUnico ? checkboxCadUnico.checked : false;
    if (nis) nis.required = marcado;
    if (beneficio) beneficio.required = marcado;
    if (reqNis) reqNis.hidden = !marcado;
    if (reqBeneficio) reqBeneficio.hidden = !marcado;
  }

  if (checkboxCadUnico) {
    checkboxCadUnico.addEventListener("change", atualizarObrigatoriedade);
    atualizarObrigatoriedade();
  }

  // =============================================================
  // 3. BUSCA DO ATLETA POR CPF E PREENCHIMENTO AUTOMÁTICO
  // =============================================================
  async function buscarAtleta() {
    var cpfLimpo = inputCpfConsulta.value.replace(/\D/g, "");

    if (cpfLimpo.length !== 11) {
      divResultadoBusca.style.display = "block";
      divResultadoBusca.innerHTML = '<div class="status-msg err">Por favor, digite um CPF válido com 11 dígitos.</div>';
      limparFormularioSocio();
      return;
    }

    limparFormularioSocio();

    btnBuscar.disabled = true;
    btnBuscar.innerText = "🔍 Buscando...";
    divResultadoBusca.style.display = "block";
    divResultadoBusca.innerHTML = '<div style="color: #6c757d; font-size: 14px;">Consultando sistema...</div>';

    try {
      var response = await supabaseClient
        .from("atletas")
        .select("id, nome_completo")
        .eq("cpf", cpfLimpo)
        .maybeSingle();

      if (response.error) throw response.error;

      var atleta = response.data;

      if (atleta) {
        atletaEncontradoId = atleta.id;

        var socioResp = await supabaseClient
          .from("socioeconomico")
          .select("*")
          .eq("atleta_id", atleta.id)
          .maybeSingle();

        var dadosSocio = socioResp.data;

        if (dadosSocio) {
          setValor("rg", dadosSocio.rg_numero);
          setValor("orgaoExpedidor", dadosSocio.rg_orgao_expeditor);
          setValor("ufRg", dadosSocio.rg_uf);
          setValor("genero", dadosSocio.genero);
          setValor("etnia", dadosSocio.etnia);
          setValor("estadoCivil", dadosSocio.estado_civil);
          setValor("nomeMae", dadosSocio.nome_mae);
          setValor("nomePai", dadosSocio.nome_pai);
          setValor("contatoEmergencia", dadosSocio.contato_emergencia);
          setValor("escolaridade", dadosSocio.escolaridade_do_atleta);
          setValor("profissaoAtual", dadosSocio.profissao_atual);
          setValor("tipoVinculoEmprego", dadosSocio.vinculo_empregaticio);
          
          if (document.getElementById("atividadeRemunerada")) {
            document.getElementById("atividadeRemunerada").checked = !!dadosSocio.possui_atividade_remunerada;
          }

          setValor("tipoHabitacao", dadosSocio.tipo_habitacao);
          setValor("moraComQuem", dadosSocio.mora_com_quem);
          setValor("qtdResidentes", dadosSocio.quantidade_residentes);
          setValor("rendaFamiliar", dadosSocio.renda_familiar_mensal);

          if (checkboxCadUnico) {
            checkboxCadUnico.checked = !!dadosSocio.possui_cadunico;
            atualizarObrigatoriedade();
          }

          setValor("numeroNis", dadosSocio.numero_nis);
          setValor("beneficioGoverno", dadosSocio.recebe_beneficio_governo);
          setValor("transporteTreino", dadosSocio.meio_transporte_treino);

          // Dispara o evento de input no RG para aplicar a máscara visual caso venha sem pontuação do banco
          if (inputRg && inputRg.value) {
            inputRg.dispatchEvent(new Event("input"));
          }

          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Ficha socioeconômica carregada para visualização/edição.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';

        } else {
          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Nenhum dado cadastrado. Preencha o formulário abaixo.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';
        }

        var btnLimparBusca = document.getElementById("btn-limpar-busca");
        if (btnLimparBusca) {
          btnLimparBusca.addEventListener("click", function () {
            if (inputCpfConsulta) inputCpfConsulta.value = "";
            limparFormularioSocio();
            divResultadoBusca.style.display = "none";
          });
        }

      } else {
        limparFormularioSocio();
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
      divResultadoBusca.innerHTML = '<div class="status-msg err">Erro ao realizar a busca. Tente novamente.</div>';
      limparFormularioSocio();
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.innerText = "🔍 Buscar Atleta";
    }
  }

  if (btnBuscar) {
    btnBuscar.addEventListener("click", buscarAtleta);
  }

  // =============================================================
  // 4. ENVIO DO FORMULÁRIO PARA A TABELA 'SOCIOECONOMICO'
  // =============================================================
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!atletaEncontradoId) {
        await buscarAtleta();
        if (!atletaEncontradoId) {
          alert("Atenção: É necessário localizar um atleta cadastrado através do CPF para vincular a ficha socioeconômica.");
          return;
        }
      }

      btnEnviar.disabled = true;
      btnEnviar.innerText = "Enviando dados...";

      try {
        // Limpeza dos campos de documento antes de salvar no banco
        var rgBruto = document.getElementById("rg").value;
        var rgLimpo = rgBruto ? rgBruto.replace(/[^0-9kK]/g, "").toUpperCase() : null;

        var nisBruto = document.getElementById("numeroNis").value;
        var nisLimpo = nisBruto ? nisBruto.replace(/\D/g, "") : null;

        var dadosSocio = {
          atleta_id: atletaEncontradoId,
          rg_numero: rgLimpo || null, // Salva apenas números (e a letra X se houver)
          rg_orgao_expeditor: document.getElementById("orgaoExpedidor").value.trim() || null,
          rg_uf: document.getElementById("ufRg").value || null,
          genero: document.getElementById("genero").value || null,
          etnia: document.getElementById("etnia").value || null,
          estado_civil: document.getElementById("estadoCivil").value || null,
          nome_mae: document.getElementById("nomeMae").value.trim() || null,
          nome_pai: document.getElementById("nomePai").value.trim() || null,
          contato_emergencia: document.getElementById("contatoEmergencia").value.trim() || null,
          escolaridade_do_atleta: document.getElementById("escolaridade").value || null,
          profissao_atual: document.getElementById("profissaoAtual").value.trim() || null,
          vinculo_empregaticio: document.getElementById("tipoVinculoEmprego").value || null,
          possui_atividade_remunerada: document.getElementById("atividadeRemunerada").checked,
          tipo_habitacao: document.getElementById("tipoHabitacao").value || null,
          mora_com_quem: document.getElementById("moraComQuem").value.trim() || null,
          quantidade_residentes: document.getElementById("qtdResidentes").value ? parseInt(document.getElementById("qtdResidentes").value, 10) : null,
          renda_familiar_mensal: document.getElementById("rendaFamiliar").value || null,
          possui_cadunico: checkboxCadUnico ? checkboxCadUnico.checked : false,
          numero_nis: nisLimpo || null, // Salva apenas números no NIS
          recebe_beneficio_governo: document.getElementById("beneficioGoverno").value || null,
          meio_transporte_treino: document.getElementById("transporteTreino").value || null
        };

        var response = await supabaseClient
          .from("socioeconomico")
          .upsert([dadosSocio]);

        if (response.error) throw response.error;

        if (submitStatus) {
          submitStatus.textContent = "✓ Formulário socioeconômico salvo e atualizado com sucesso!";
          submitStatus.className = "status-msg ok";
        }

        alert("Dados socioeconômicos salvos com sucesso!");

      } catch (err) {
        console.error("Erro ao salvar dados socioeconômicos:", err);
        if (submitStatus) {
          submitStatus.textContent = "Erro ao enviar: " + (err.message || "Tente novamente.");
          submitStatus.className = "status-msg err";
        }
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Enviar Dados Socioeconômicos";
      }
    });
  }

});