import { supabase } from './supabase.js';

export const ATHLETE_AUTH_DOMAIN = 'atletas.apan.internal';

export function normalizeCpf(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 11);
}

export function formatCpf(value = '') {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return value || '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function athleteAuthEmail(cpf) {
  const normalized = normalizeCpf(cpf);
  return `${normalized}@${ATHLETE_AUTH_DOMAIN}`;
}

export async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export async function getAthleteProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('atletas')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAdminProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('administradores')
    .select('id, auth_user_id, nome, ativo')
    .eq('auth_user_id', userId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requireAthlete(redirectTo = './index.html') {
  const user = await getAuthenticatedUser();
  if (!user) {
    window.location.replace(redirectTo);
    return null;
  }

  const athlete = await getAthleteProfile(user.id);
  if (!athlete) {
    await supabase.auth.signOut();
    window.location.replace(redirectTo);
    return null;
  }

  return { user, athlete };
}

export async function requireAdmin(redirectTo = '../index.html') {
  const user = await getAuthenticatedUser();
  if (!user) {
    window.location.replace(redirectTo);
    return null;
  }

  const admin = await getAdminProfile(user.id);
  if (!admin) {
    await supabase.auth.signOut();
    window.location.replace(redirectTo);
    return null;
  }

  return { user, admin };
}

export async function getAccessContext() {
  const user = await getAuthenticatedUser();
  if (!user) return { user: null, role: null, athlete: null, admin: null };

  const [admin, athlete] = await Promise.all([
    getAdminProfile(user.id),
    getAthleteProfile(user.id)
  ]);

  if (admin) return { user, role: 'admin', admin, athlete: null };
  if (athlete) return { user, role: 'athlete', athlete, admin: null };
  return { user, role: null, athlete: null, admin: null };
}

export async function signOutAndRedirect(redirectTo = './index.html') {
  await supabase.auth.signOut();
  window.location.replace(redirectTo);
}
