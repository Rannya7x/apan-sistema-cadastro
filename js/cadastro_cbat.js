// =============================================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================================
const SUPABASE_URL = 'https://jaslvoxljchhhkompelu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphc2x2b3hsamNoaGhrb21wZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDY0MDAsImV4cCI6MjA5NzMyMjQwMH0.MoxG26k7LvtGm5hWvoA3YROXh6vJ3LARs9ndjF98hpc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nome do bucket no Supabase Storage
const BUCKET_NAME = 'documentos-atletas';

document.addEventListener("DOMContentLoaded", function () {

  // Elementos do DOM
  var inputCpfConsulta = document.getElementById("cpf-consulta");
  var btnBuscar = document.getElementById("btn-buscar");
  var divResultadoBusca = document.getElementById("resultado-busca");

  var form = document.getElementById("form-cbat");
  var btnSubmit = form ? form.querySelector(".btn-submit") : null;
  var submitStatus = document.getElementById("submit-status");

  // Inputs de arquivos
  var inputFoto = document.getElementById("foto");
  var inputDocRgCpf = document.getElementById("doc-rg-cpf");
  var inputComprovante = document.getElementById("comprovante-residencia");
  var inputCartaoSus = document.getElementById("cartao-sus");
  var inputLaudoMedico = document.getElementById("laudo-medico");

  // Checkboxes dos Termos
  var checkTermoImagem = document.getElementById("termo_imagem");
  var checkTermoWhatsapp = document.getElementById("termo_whatsapp");
  var checkTermoLgpd = document.getElementById("termo_lgpd");

  // Armazena o ID e URLs do atleta encontrado
  var atletaEncontradoId = null;
  var urlsExistentes = {
    foto_url: null,
    rg_cpf_url: null,
    comprovante_residencia_url: null,
    cartao_sus_url: null,
    laudo_medico_url: null
  };

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
        limparFormularioDocumentos();
        if (divResultadoBusca) divResultadoBusca.style.display = "none";
      }
    });
  }

  // =============================================================
  // FUNÇÃO PARA LIMPAR FORMULÁRIO E RESETAR ESTADOS
  // =============================================================
  function limparFormularioDocumentos() {
    var cpfDigitado = inputCpfConsulta ? inputCpfConsulta.value : "";
    
    if (form) form.reset();
    if (inputCpfConsulta) inputCpfConsulta.value = cpfDigitado;
    
    atletaEncontradoId = null;
    urlsExistentes = {
      foto_url: null,
      rg_cpf_url: null,
      comprovante_residencia_url: null,
      cartao_sus_url: null,
      laudo_medico_url: null
    };

    // Restaura a obrigatoriedade original dos campos principais
    if (inputFoto) inputFoto.required = true;
    if (inputDocRgCpf) inputDocRgCpf.required = true;
    if (inputComprovante) inputComprovante.required = true;

    // Limpa previews de links
    document.querySelectorAll(".file-preview").forEach(function (el) {
      el.innerHTML = "";
    });

    if (submitStatus) {
      submitStatus.style.display = "none";
      submitStatus.innerHTML = "";
    }
  }

  // Helper para exibir link de documento já enviado
  function exibirPreviewDocumento(idPreview, url, rotulo) {
    var container = document.getElementById(idPreview);
    if (!container) return;

    if (url) {
      container.innerHTML = 
        '<span style="color: #0f5132;">✓ Arquivo já enviado: </span>' +
        '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color: #1a73e8; font-weight: 600; text-decoration: underline;">' +
          'Ver ' + rotulo +
        '</a> <small style="color: #6c757d;">(Envie outro arquivo se desejar substituir)</small>';
    } else {
      container.innerHTML = "";
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
      limparFormularioDocumentos();
      return;
    }

    limparFormularioDocumentos();

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

        // 2. Consulta tabela 'documentos_atletas'
        var docResp = await supabaseClient
          .from("documentos_atletas")
          .select("*")
          .eq("atleta_id", atleta.id)
          .maybeSingle();

        var docs = docResp.data;

        if (docs) {
          urlsExistentes = {
            foto_url: docs.foto_url,
            rg_cpf_url: docs.rg_cpf_url,
            comprovante_residencia_url: docs.comprovante_residencia_url,
            cartao_sus_url: docs.cartao_sus_url,
            laudo_medico_url: docs.laudo_medico_url
          };

          // Se o arquivo já foi enviado antes, ele não precisa ser obrigatório de novo
          if (docs.foto_url && inputFoto) inputFoto.required = false;
          if (docs.rg_cpf_url && inputDocRgCpf) inputDocRgCpf.required = false;
          if (docs.comprovante_residencia_url && inputComprovante) inputComprovante.required = false;

          // Exibe os links dos arquivos já enviados
          exibirPreviewDocumento("preview-foto", docs.foto_url, "Foto");
          exibirPreviewDocumento("preview-doc-rg-cpf", docs.rg_cpf_url, "Documento RG/CPF");
          exibirPreviewDocumento("preview-comprovante-residencia", docs.comprovante_residencia_url, "Comprovante");
          exibirPreviewDocumento("preview-cartao-sus", docs.cartao_sus_url, "Cartão SUS");
          exibirPreviewDocumento("preview-laudo-medico", docs.laudo_medico_url, "Laudo Médico");

          // Preenche os checkboxes dos termos
          if (checkTermoImagem) checkTermoImagem.checked = !!docs.termo_imagem;
          if (checkTermoWhatsapp) checkTermoWhatsapp.checked = !!docs.termo_whatsapp;
          if (checkTermoLgpd) checkTermoLgpd.checked = !!docs.termo_lgpd;

          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Documentos já cadastrados carregados para consulta/atualização.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';

        } else {
          divResultadoBusca.innerHTML = 
            '<div style="background: #e7f3ff; border: 1px solid #c5d5ea; color: #0c4a6e; padding: 12px; border-radius: 10px; font-size: 14.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">' +
              '<div>' +
                '<strong>✓ Atleta Encontrado:</strong> ' + atleta.nome_completo + ' <br>' +
                '<small style="color: #0369a1;">Nenhum documento enviado anteriormente. Faça o upload abaixo.</small>' +
              '</div>' +
              '<button type="button" id="btn-limpar-busca" style="background: #bae6fd; border: none; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">Limpar / Outro CPF</button>' +
            '</div>';
        }

        var btnLimparBusca = document.getElementById("btn-limpar-busca");
        if (btnLimparBusca) {
          btnLimparBusca.addEventListener("click", function () {
            if (inputCpfConsulta) inputCpfConsulta.value = "";
            limparFormularioDocumentos();
            divResultadoBusca.style.display = "none";
          });
        }

      } else {
        limparFormularioDocumentos();
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
      limparFormularioDocumentos();
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.innerText = "🔍 Buscar Atleta";
    }
  }

  if (btnBuscar) {
    btnBuscar.addEventListener("click", buscarAtleta);
  }

  // =============================================================
  // FUNÇÃO DE UPLOAD PARA O SUPABASE STORAGE
  // =============================================================
  async function subirArquivoStorage(file, tipo, cpf) {
    if (!file) return null;

    var ext = file.name.split('.').pop();
    var nomeArquivo = `${tipo}_${cpf}_${Date.now()}.${ext}`;

    var { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(nomeArquivo, file, { upsert: true });

    if (error) {
      console.error(`Erro ao subir ${tipo}:`, error.message);
      throw error;
    }

    var { data: publicUrlData } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(nomeArquivo);

    return publicUrlData.publicUrl;
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
          alert("Atenção: É necessário pesquisar um atleta cadastrado via CPF antes de enviar os documentos.");
          return;
        }
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Enviando documentos...";
      }

      if (submitStatus) {
        submitStatus.style.display = "block";
        submitStatus.style.background = "#e2e3e5";
        submitStatus.style.color = "#383d41";
        submitStatus.innerText = "Enviando arquivos e registrando cadastro...";
      }

      try {
        var cpfLimpo = inputCpfConsulta.value.replace(/\D/g, "");

        // Executa o upload apenas se um novo arquivo tiver sido selecionado no input
        var fileFoto = inputFoto?.files[0];
        var fileRgCpf = inputDocRgCpf?.files[0];
        var fileComprovante = inputComprovante?.files[0];
        var fileSus = inputCartaoSus?.files[0];
        var fileLaudo = inputLaudoMedico?.files[0];

        var fotoUrlFinal = fileFoto ? await subirArquivoStorage(fileFoto, "foto", cpfLimpo) : urlsExistentes.foto_url;
        var rgCpfUrlFinal = fileRgCpf ? await subirArquivoStorage(fileRgCpf, "rg_cpf", cpfLimpo) : urlsExistentes.rg_cpf_url;
        var comprovanteUrlFinal = fileComprovante ? await subirArquivoStorage(fileComprovante, "comprovante", cpfLimpo) : urlsExistentes.comprovante_residencia_url;
        var susUrlFinal = fileSus ? await subirArquivoStorage(fileSus, "sus", cpfLimpo) : urlsExistentes.cartao_sus_url;
        var laudoUrlFinal = fileLaudo ? await subirArquivoStorage(fileLaudo, "laudo", cpfLimpo) : urlsExistentes.laudo_medico_url;

        // Monta os dados para a tabela 'documentos_atletas'
        var dadosDocumentos = {
          atleta_id: atletaEncontradoId,
          foto_url: fotoUrlFinal,
          rg_cpf_url: rgCpfUrlFinal,
          comprovante_residencia_url: comprovanteUrlFinal,
          cartao_sus_url: susUrlFinal,
          laudo_medico_url: laudoUrlFinal,
          termo_imagem: !!checkTermoImagem?.checked,
          termo_whatsapp: !!checkTermoWhatsapp?.checked,
          termo_lgpd: !!checkTermoLgpd?.checked,
          updated_at: new Date().toISOString()
        };

        var response = await supabaseClient
          .from("documentos_atletas")
          .upsert([dadosDocumentos]);

        if (response.error) throw response.error;

        if (submitStatus) {
          submitStatus.style.background = "#d1e7dd";
          submitStatus.style.color = "#0f5132";
          submitStatus.style.border = "1px solid #badbcc";
          submitStatus.innerText = "✓ Cadastro e documentos enviados com sucesso!";
        }

        alert("Documentos e termos enviados com sucesso!");

      } catch (err) {
        console.error("Erro ao enviar documentos:", err);
        if (submitStatus) {
          submitStatus.style.background = "#f8d7da";
          submitStatus.style.color = "#842029";
          submitStatus.style.border = "1px solid #f5c2c7";
          submitStatus.innerText = "Erro ao enviar cadastro: " + (err.message || "Tente novamente.");
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerText = "Finalizar e Enviar Cadastro";
        }
      }
    });
  }

});