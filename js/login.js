import { supabase } from './src/lib/supabase.js';
import { athleteAuthEmail, normalizeCpf, getAccessContext } from './src/lib/auth.js';

const athleteForm = document.getElementById('form-login-atleta');
const adminForm = document.getElementById('form-login-admin');
const statusEl = document.getElementById('login-status');
const athleteCpfInput = document.getElementById('login-cpf');
const adminEmailInput = document.getElementById('admin-email');
const athleteCpfStatus = document.getElementById('login-cpf-status');
const adminEmailStatus = document.getElementById('admin-email-status');

let athleteCpfCheck = { value: '', exists: null, hasAccess: null };
let adminEmailCheck = { value: '', exists: null };
let athleteCheckTimer = null;
let adminCheckTimer = null;

function showStatus(message, type = 'info', withRegister = false) {
  if (!statusEl) return;
  statusEl.className = `auth-status ${type}`;
  statusEl.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = message;
  statusEl.appendChild(p);
  if (withRegister) {
    const a = document.createElement('a');
    a.href = './html/inscricao.html';
    a.className = 'auth-inline-button';
    a.textContent = 'Realizar cadastro';
    statusEl.appendChild(a);
  }
}

function clearStatus() {
  if (!statusEl) return;
  statusEl.textContent = '';
  statusEl.className = 'auth-status';
}

function setFieldFeedback(element, message = '', type = '') {
  if (!element) return;
  element.textContent = message;
  element.className = `field-feedback${type ? ` ${type}` : ''}`;
}

function resetPublicForms() {
  athleteForm?.reset();
  adminForm?.reset();
  if (athleteCpfInput) athleteCpfInput.value = '';
  if (adminEmailInput) adminEmailInput.value = '';
  const athletePassword = document.getElementById('login-senha');
  const adminPassword = document.getElementById('admin-senha');
  if (athletePassword) athletePassword.value = '';
  if (adminPassword) adminPassword.value = '';
  athleteCpfCheck = { value: '', exists: null, hasAccess: null };
  adminEmailCheck = { value: '', exists: null };
  setFieldFeedback(athleteCpfStatus);
  setFieldFeedback(adminEmailStatus);
  clearStatus();
}

async function checkAccess(body) {
  const { data, error } = await supabase.functions.invoke('check-access', { body });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Não foi possível validar o acesso.');
  return data;
}

async function validateAthleteCpf(cpf, showPositive = false) {
  if (cpf.length !== 11) {
    athleteCpfCheck = { value: cpf, exists: null, hasAccess: null };
    setFieldFeedback(athleteCpfStatus);
    return athleteCpfCheck;
  }

  setFieldFeedback(athleteCpfStatus, 'Verificando CPF...', 'checking');
  try {
    const data = await checkAccess({ mode: 'athlete-cpf', cpf });
    athleteCpfCheck = { value: cpf, exists: !!data.exists, hasAccess: !!data.hasAccess };
    if (!data.exists) {
      setFieldFeedback(athleteCpfStatus, 'CPF incorreto ou não existe cadastro para este CPF.', 'error');
    } else if (!data.hasAccess) {
      setFieldFeedback(athleteCpfStatus, 'CPF cadastrado, mas o acesso ainda não está habilitado. Procure a administração.', 'error');
    } else if (showPositive) {
      setFieldFeedback(athleteCpfStatus, 'CPF localizado.', 'success');
    } else {
      setFieldFeedback(athleteCpfStatus);
    }
    return athleteCpfCheck;
  } catch (error) {
    console.error('Erro ao validar CPF:', error);
    athleteCpfCheck = { value: cpf, exists: null, hasAccess: null };
    setFieldFeedback(athleteCpfStatus, 'Não foi possível verificar o CPF agora.', 'error');
    return athleteCpfCheck;
  }
}

async function validateAdminEmail(email, showPositive = false) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !adminEmailInput?.validity.valid) {
    adminEmailCheck = { value: normalized, exists: null };
    setFieldFeedback(adminEmailStatus);
    return adminEmailCheck;
  }

  setFieldFeedback(adminEmailStatus, 'Verificando e-mail...', 'checking');
  try {
    const data = await checkAccess({ mode: 'admin-email', email: normalized });
    adminEmailCheck = { value: normalized, exists: !!data.exists };
    if (!data.exists) {
      setFieldFeedback(adminEmailStatus, 'Este e-mail não está cadastrado como administrador.', 'error');
    } else if (showPositive) {
      setFieldFeedback(adminEmailStatus, 'Administrador localizado.', 'success');
    } else {
      setFieldFeedback(adminEmailStatus);
    }
    return adminEmailCheck;
  } catch (error) {
    console.error('Erro ao validar e-mail administrativo:', error);
    adminEmailCheck = { value: normalized, exists: null };
    setFieldFeedback(adminEmailStatus, 'Não foi possível verificar o e-mail agora.', 'error');
    return adminEmailCheck;
  }
}

function maskCpf(input) {
  input.addEventListener('input', () => {
    let v = normalizeCpf(input.value);
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = v;
  });
}

document.querySelectorAll('[data-cpf]').forEach(maskCpf);
document.querySelectorAll('[data-auth-tab]').forEach((button) => button.addEventListener('click', () => {
  const target = button.dataset.authTab;
  document.querySelectorAll('[data-auth-tab]').forEach((b) => b.classList.toggle('active', b === button));
  document.querySelectorAll('.auth-panel').forEach((panel) => panel.classList.toggle('active', panel.id === target));
  clearStatus();
}));

athleteCpfInput?.addEventListener('input', () => {
  clearTimeout(athleteCheckTimer);
  const cpf = normalizeCpf(athleteCpfInput.value);
  athleteCpfCheck = { value: cpf, exists: null, hasAccess: null };
  setFieldFeedback(athleteCpfStatus);
  if (cpf.length === 11) {
    athleteCheckTimer = setTimeout(() => validateAthleteCpf(cpf), 300);
  }
});

athleteCpfInput?.addEventListener('blur', () => {
  const cpf = normalizeCpf(athleteCpfInput.value);
  if (cpf.length === 11 && athleteCpfCheck.value !== cpf) validateAthleteCpf(cpf);
});

adminEmailInput?.addEventListener('input', () => {
  clearTimeout(adminCheckTimer);
  const email = adminEmailInput.value.trim().toLowerCase();
  adminEmailCheck = { value: email, exists: null };
  setFieldFeedback(adminEmailStatus);
  if (email && adminEmailInput.validity.valid) {
    adminCheckTimer = setTimeout(() => validateAdminEmail(email), 400);
  }
});

adminEmailInput?.addEventListener('blur', () => {
  const email = adminEmailInput.value.trim().toLowerCase();
  if (email && adminEmailInput.validity.valid && adminEmailCheck.value !== email) validateAdminEmail(email);
});

athleteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const cpf = normalizeCpf(athleteCpfInput?.value);
  const password = document.getElementById('login-senha').value;
  const button = athleteForm.querySelector('button[type="submit"]');

  if (cpf.length !== 11) {
    showStatus('Digite um CPF válido com 11 dígitos.', 'error', true);
    return;
  }

  const checked = athleteCpfCheck.value === cpf && athleteCpfCheck.exists !== null
    ? athleteCpfCheck
    : await validateAthleteCpf(cpf);

  if (checked.exists === false) {
    showStatus('CPF incorreto ou não existe cadastro para este CPF.', 'error', true);
    return;
  }
  if (checked.exists === true && checked.hasAccess === false) {
    showStatus('Este CPF possui cadastro, mas ainda não possui acesso habilitado. Procure a administração.', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = 'Entrando...';
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: athleteAuthEmail(cpf), password });
    if (error || !data?.user) throw error || new Error('Credenciais inválidas.');
    const { data: athlete, error: athleteError } = await supabase.from('atletas').select('id').eq('auth_user_id', data.user.id).maybeSingle();
    if (athleteError || !athlete) {
      await supabase.auth.signOut();
      throw new Error('Cadastro não vinculado.');
    }
    window.location.replace('./home.html');
  } catch (error) {
    console.error(error);
    showStatus('CPF ou senha incorretos.', 'error', true);
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar como atleta';
  }
});

adminForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = adminEmailInput.value.trim().toLowerCase();
  const password = document.getElementById('admin-senha').value;
  const button = adminForm.querySelector('button[type="submit"]');

  const checked = adminEmailCheck.value === email && adminEmailCheck.exists !== null
    ? adminEmailCheck
    : await validateAdminEmail(email);

  if (checked.exists === false) {
    showStatus('Este e-mail não está cadastrado como administrador.', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = 'Entrando...';
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user) throw error || new Error('Credenciais inválidas.');
    const { data: admin, error: adminError } = await supabase.from('administradores').select('id').eq('auth_user_id', data.user.id).eq('ativo', true).maybeSingle();
    if (adminError || !admin) {
      await supabase.auth.signOut();
      throw new Error('Sem permissão administrativa.');
    }
    window.location.replace('./admin.html');
  } catch (error) {
    console.error(error);
    showStatus('Senha inválida ou usuário sem permissão administrativa.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar como administrador';
  }
});

resetPublicForms();

window.addEventListener('pageshow', (event) => {
  if (event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'reload') resetPublicForms();
});

(async () => {
  try {
    const ctx = await getAccessContext();
    if (ctx.role === 'admin') window.location.replace('./admin.html');
    else if (ctx.role === 'athlete') window.location.replace('./home.html');
  } catch (error) {
    console.error(error);
  }
})();
