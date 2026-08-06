(function () {
  var checkbox = document.getElementById("possuiCadUnico");
  var nis = document.getElementById("numeroNis");
  var beneficio = document.getElementById("beneficioGoverno");
  var reqNis = document.getElementById("req-nis");
  var reqBeneficio = document.getElementById("req-beneficio");

  function atualizarObrigatoriedade() {
    var marcado = checkbox.checked;

    nis.required = marcado;
    beneficio.required = marcado;

    reqNis.hidden = !marcado;
    reqBeneficio.hidden = !marcado;
  }

  checkbox.addEventListener("change", atualizarObrigatoriedade);
  atualizarObrigatoriedade();

  var formData = {};
  var form = document.getElementById("socio-form");
  var submitStatus = document.getElementById("submit-status");

  function coletarDados() {
    formData.cpf = document.getElementById("cpf").value.trim();
    formData.rg = document.getElementById("rg").value.trim();
    formData.orgaoExpedidor = document.getElementById("orgaoExpedidor").value.trim();
    formData.ufRg = document.getElementById("ufRg").value;
    formData.genero = document.getElementById("genero").value;
    formData.etnia = document.getElementById("etnia").value;
    formData.estadoCivil = document.getElementById("estadoCivil").value;
    formData.nomeMae = document.getElementById("nomeMae").value.trim();
    formData.nomePai = document.getElementById("nomePai").value.trim();
    formData.contatoEmergencia = document.getElementById("contatoEmergencia").value.trim();
    formData.escolaridade = document.getElementById("escolaridade").value;
    formData.profissaoAtual = document.getElementById("profissaoAtual").value.trim();
    formData.tipoVinculoEmprego = document.getElementById("tipoVinculoEmprego").value;
    formData.possuiAtividadeRemunerada = document.getElementById("atividadeRemunerada").checked;
    formData.tipoHabitacao = document.getElementById("tipoHabitacao").value;
    formData.moraComQuem = document.getElementById("moraComQuem").value.trim();
    formData.qtdResidentes = document.getElementById("qtdResidentes").value
      ? parseInt(document.getElementById("qtdResidentes").value, 10)
      : null;
    formData.rendaFamiliar = document.getElementById("rendaFamiliar").value;
    formData.possuiCadUnico = document.getElementById("possuiCadUnico").checked;
    formData.numeroNis = document.getElementById("numeroNis").value.trim();
    formData.beneficioGoverno = document.getElementById("beneficioGoverno").value;
    formData.transporteTreino = document.getElementById("transporteTreino").value;

    return formData;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    coletarDados();
    console.log("Dados do formulário socioeconômico:", formData);

    if (submitStatus) {
      submitStatus.textContent = "Dados capturados com sucesso! Prontos para envio.";
      submitStatus.className = "status-msg ok";
    }
  });
})();