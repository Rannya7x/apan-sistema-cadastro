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

  var form = document.getElementById("form-uniforme");
  var btnSubmit = form ? form.querySelector(".btn-submit") : null;
  var submitStatus = document.getElementById("submit-status");

  // Campos do uniforme
  var selectCamiseta = document.getElementById("tamanho_camiseta");
  var selectShort = document.getElementById("tamanho_short");
  var selectTenis = document.getElementById("tamanho_tenis");
  var selectSapatilha = document.getElementById("tamanho_sapatilha");
  var textareaObservacao = document.getElementById("observacao_uniforme");

  // Armazena o ID do atleta encontrado
  var atletaEncontradoId = null;

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
        limparFormularioUniforme();
        if (divResultadoBusca) divResultadoBusca.style.display = "none";
      }
    });
  }

  // =============================================================
  // FUNÇÃO PARA LIMPAR FORMULÁRIO E RESETAR ESTADOS
  // =============================================================
  function limparFormularioUniforme() {
    var cpfDigitado = inputCpfConsulta ? inputCpfConsulta.value : "";
    
    if (form) form.reset();
    if (inputCpfConsulta) inputCpfConsulta.value = cpfDigitado;
    
    atletaEncontradoId = null;

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
      limparFormularioUniforme();
      return;
    }

    limparFormularioUniforme();

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

        // 2. Consulta tabela 'uniformes_atletas'
        var uniformeResp = await supabaseClient
          .from("uniformes_atletas")
          .select("*")
          .eq("atleta_id", atleta.id)
          .maybeSingle();

        var uniforme = uniformeResp.data;

        if (uniforme) {
          // Preenche os campos com os dados existentes
          if (selectCamiseta) selectCamiseta.value = uniforme.tamanho_camiseta || "";
          if (selectShort) selectShort.value = uniforme.tamanho_short || "";
          if (selectTenis) selectTenis.value = uniforme.tamanho_tenis || "";
          if (selectSapatilha) selectSapatilha.value = uniforme.tamanho_sapatilha || "";
          if (textareaObservacao) textareaObservacao.value = uniforme.observacao || "";

          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Tamanhos já cadastrados carregados para consulta/atualização.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';

        } else {
          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Nenhum tamanho de uniforme cadastrado. Preencha abaixo.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';
        }

        var btnLimparBusca = document.getElementById("btn-limpar-busca");
        if (btnLimparBusca) {
          btnLimparBusca.addEventListener("click", function () {
            if (inputCpfConsulta) inputCpfConsulta.value = "";
            limparFormularioUniforme();
            divResultadoBusca.style.display = "none";
          });
        }

      } else {
        limparFormularioUniforme();
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
      limparFormularioUniforme();
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.innerText = "🔍 Buscar Atleta";
    }
  }

  if (btnBuscar) {
    btnBuscar.addEventListener("click", buscarAtleta);
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

      // Validação dos campos obrigatórios
      if (!selectCamiseta.value || !selectShort.value || !selectTenis.value || !selectSapatilha.value) {
        alert("Preencha todos os tamanhos obrigatórios.");
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Salvando dados...";
      }

      if (submitStatus) {
        submitStatus.style.display = "block";
        submitStatus.style.background = "#e2e3e5";
        submitStatus.style.color = "#383d41";
        submitStatus.innerText = "Salvando tamanhos do uniforme...";
      }

      try {
        // Monta os dados para a tabela 'uniformes_atletas'
        var dadosUniforme = {
          atleta_id: atletaEncontradoId,
          tamanho_camiseta: selectCamiseta.value,
          tamanho_short: selectShort.value,
          tamanho_tenis: selectTenis.value,
          tamanho_sapatilha: selectSapatilha.value,
          observacao: textareaObservacao?.value.trim() || null,
          updated_at: new Date().toISOString()
        };

        var response = await supabaseClient
          .from("uniformes_atletas")
          .upsert([dadosUniforme], { onConflict: 'atleta_id' });

        if (response.error) throw response.error;

        if (submitStatus) {
          submitStatus.style.background = "#d1e7dd";
          submitStatus.style.color = "#0f5132";
          submitStatus.style.border = "1px solid #badbcc";
          submitStatus.innerText = "✓ Tamanhos do uniforme salvos com sucesso!";
        }

        alert("Tamanhos do uniforme salvos com sucesso!");

        // Limpa a busca para permitir novo cadastro
        if (inputCpfConsulta) inputCpfConsulta.value = "";
        limparFormularioUniforme();
        divResultadoBusca.style.display = "none";

      } catch (err) {
        console.error("Erro ao salvar uniforme:", err);
        if (submitStatus) {
          submitStatus.style.background = "#f8d7da";
          submitStatus.style.color = "#842029";
          submitStatus.style.border = "1px solid #f5c2c7";
          submitStatus.innerText = "Erro ao salvar: " + (err.message || "Tente novamente.");
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = "Salvar Tamanhos do Uniforme";
        }
      }
    });
  }

});