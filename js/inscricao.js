import { supabase } from './src/lib/supabase.js';
import { athleteAuthEmail, normalizeCpf } from './src/lib/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const btnSubmit = document.querySelector('.btn-submit');
  const inputCPF = document.getElementById('cpf');
  const inputWhatsApp = document.getElementById('whatsapp');
  const inputDataNascimento = document.getElementById('datanascimento');
  const campoResponsavel = document.getElementById('campo-responsavel');
  const inputResponsavel = document.getElementById('nomeresponsavel');
  const campoFoto = document.getElementById('campo-foto');
  const inputFoto = document.getElementById('foto');
  const campoTipoDeficiencia = document.getElementById('campo-tipo-deficiencia');
  const campoQualEquipamento = document.getElementById('campo-qual-equipamento');
  const inputQualEquipamento = document.getElementById('qual_equipamento');
  const statusEl = document.getElementById('submit-status');
  const cpfStatusEl = document.getElementById('cpf-status');
  let cpfCheck = { value: '', exists: null };
  let cpfCheckTimer = null;

  function setStatus(message, type = 'info') {
    if (!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.textContent = message;
    statusEl.style.padding = '10px 12px';
    statusEl.style.borderRadius = '8px';
    if (type === 'error') {
      statusEl.style.background = '#f8d7da';
      statusEl.style.color = '#842029';
    } else if (type === 'success') {
      statusEl.style.background = '#d1e7dd';
      statusEl.style.color = '#0f5132';
    } else {
      statusEl.style.background = '#e7f3ff';
      statusEl.style.color = '#0c4a6e';
    }
  }


  function setCpfStatus(message = '', type = '') {
    if (!cpfStatusEl) return;
    cpfStatusEl.textContent = message;
    cpfStatusEl.className = `field-validation${type ? ` ${type}` : ''}`;
  }

  async function verificarCpfCadastrado(cpf, showAvailable = false) {
    if (cpf.length !== 11) {
      cpfCheck = { value: cpf, exists: null };
      setCpfStatus();
      return cpfCheck;
    }
    setCpfStatus('Verificando CPF...', 'checking');
    try {
      const { data, error } = await supabase.functions.invoke('check-access', {
        body: { mode: 'athlete-cpf', cpf }
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Não foi possível verificar o CPF.');
      cpfCheck = { value: cpf, exists: !!data.exists };
      if (cpfCheck.exists) setCpfStatus('Este CPF já possui cadastro. Use a tela de login.', 'error');
      else if (showAvailable) setCpfStatus('CPF disponível para cadastro.', 'success');
      else setCpfStatus();
      return cpfCheck;
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      cpfCheck = { value: cpf, exists: null };
      setCpfStatus('Não foi possível verificar o CPF agora.', 'error');
      return cpfCheck;
    }
  }

  function resetCadastroForm() {
    form?.reset();
    if (inputCPF) inputCPF.value = '';
    if (inputWhatsApp) inputWhatsApp.value = '';
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.style.display = 'none';
    }
    cpfCheck = { value: '', exists: null };
    setCpfStatus();
    campoResponsavel?.classList.remove('active');
    campoFoto?.classList.remove('active');
    campoTipoDeficiencia?.classList.remove('active');
    campoQualEquipamento?.classList.remove('active');
  }

  inputCPF?.addEventListener('input', (event) => {
    let value = normalizeCpf(event.target.value);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    event.target.value = value;
    clearTimeout(cpfCheckTimer);
    const cpf = normalizeCpf(value);
    cpfCheck = { value: cpf, exists: null };
    setCpfStatus();
    if (cpf.length === 11) cpfCheckTimer = setTimeout(() => verificarCpfCadastrado(cpf), 300);
  });

  inputCPF?.addEventListener('blur', () => {
    const cpf = normalizeCpf(inputCPF.value);
    if (cpf.length === 11 && cpfCheck.value !== cpf) verificarCpfCadastrado(cpf);
  });

  inputWhatsApp?.addEventListener('input', (event) => {
    let value = event.target.value.replace(/\D/g, '').slice(0, 11);
    if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    else if (value.length > 0) value = value.replace(/^(\d*)$/, '($1');
    event.target.value = value;
  });

  inputDataNascimento?.addEventListener('change', () => {
    if (!inputDataNascimento.value) return;
    const nascimento = new Date(`${inputDataNascimento.value}T12:00:00`);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade -= 1;

    const menor = idade < 18;
    campoResponsavel?.classList.toggle('active', menor);
    if (inputResponsavel) {
      inputResponsavel.required = menor;
      if (!menor) inputResponsavel.value = '';
    }
  });

  document.querySelectorAll('input[name="modulo"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const precisaFoto = radio.checked && (radio.value === 'preinscricao' || radio.value === 'ambos');
      if (!radio.checked) return;
      campoFoto?.classList.toggle('active', precisaFoto);
      if (inputFoto) {
        inputFoto.required = precisaFoto;
        if (!precisaFoto) inputFoto.value = '';
      }
    });
  });

  document.querySelectorAll('input[name="deficiencia"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const sim = radio.value === 'sim';
      campoTipoDeficiencia?.classList.toggle('active', sim);
      campoTipoDeficiencia?.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.required = sim;
        if (!sim) input.checked = false;
      });
    });
  });

  document.querySelectorAll('input[name="equipamentos"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const sim = radio.value === 'sim';
      campoQualEquipamento?.classList.toggle('active', sim);
      if (inputQualEquipamento) {
        inputQualEquipamento.required = sim;
        if (!sim) inputQualEquipamento.value = '';
      }
    });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const cpf = normalizeCpf(inputCPF?.value);
    const password = document.getElementById('senha').value;
    const passwordConfirmation = document.getElementById('confirmar-senha').value;

    if (cpf.length !== 11) {
      setStatus('Digite um CPF válido com 11 dígitos.', 'error');
      return;
    }
    const checkedCpf = cpfCheck.value === cpf && cpfCheck.exists !== null
      ? cpfCheck
      : await verificarCpfCadastrado(cpf);
    if (checkedCpf.exists === true) {
      setStatus('Este CPF já possui cadastro. Volte para a tela inicial e faça login.', 'error');
      return;
    }
    if (password.length < 8) {
      setStatus('A senha precisa ter pelo menos 8 caracteres.', 'error');
      return;
    }
    if (password !== passwordConfirmation) {
      setStatus('A confirmação de senha não confere.', 'error');
      return;
    }

    const deficiencia = document.querySelector('input[name="deficiencia"]:checked')?.value || 'nao';
    const equipamentos = document.querySelector('input[name="equipamentos"]:checked')?.value || 'nao';
    const payload = {
      nomeCompleto: document.getElementById('nome').value.trim(),
      cpf,
      dataNascimento: inputDataNascimento.value,
      nomeResponsavel: inputResponsavel?.value.trim() || null,
      emailContato: document.getElementById('email').value.trim(),
      whatsapp: inputWhatsApp?.value.trim() || null,
      modulo: document.querySelector('input[name="modulo"]:checked')?.value || null,
      possuiDeficiencia: deficiencia,
      tipoDeficiencia: deficiencia === 'sim'
        ? document.querySelector('input[name="tipo_deficiencia"]:checked')?.value || null
        : 'Não possui',
      possuiEquipamentos: equipamentos,
      qualEquipamento: equipamentos === 'sim' ? inputQualEquipamento?.value.trim() || null : null,
      password
    };

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Criando cadastro...';
    setStatus('Criando seu cadastro e acesso ao portal...');

    try {
      const { data: registerData, error: registerError } = await supabase.functions.invoke('register-athlete', {
        body: payload
      });

      if (registerError) throw registerError;
      if (!registerData?.ok) throw new Error(registerData?.message || 'Não foi possível criar o cadastro.');

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: athleteAuthEmail(cpf),
        password
      });
      if (loginError || !loginData?.user) throw loginError || new Error('Cadastro criado, mas não foi possível iniciar a sessão.');

      if (inputFoto?.files?.[0]) {
        setStatus('Cadastro criado. Enviando a foto...');
        const file = inputFoto.files[0];
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${loginData.user.id}/perfil_${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos-atletas')
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('fotos-atletas').getPublicUrl(path);
        const { error: updateError } = await supabase
          .from('atletas')
          .update({ foto_url: publicUrlData.publicUrl })
          .eq('auth_user_id', loginData.user.id);
        if (updateError) throw updateError;
      }

      setStatus('Cadastro criado com sucesso. Entrando no sistema...', 'success');
      window.location.replace('../home.html');
    } catch (error) {
      console.error('Erro ao criar inscrição:', error);
      const message = error?.message?.includes('409')
        ? 'Este CPF já está cadastrado. Volte para a tela inicial e faça login.'
        : (error?.message || 'Não foi possível concluir o cadastro.');
      setStatus(message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Criar cadastro e acesso';
    }
  });

  resetCadastroForm();

  window.addEventListener('pageshow', (event) => {
    if (event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'reload') resetCadastroForm();
  });

});
