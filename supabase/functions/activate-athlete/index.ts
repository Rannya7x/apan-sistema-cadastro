import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const AUTH_DOMAIN = 'atletas.apan.internal';
const normalizeCpf = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(0, 11);
const authEmail = (cpf: string) => `${cpf}@${AUTH_DOMAIN}`;


function getServerKey() {
  const namedKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys);
      if (parsed.default) return String(parsed.default);
      const first = Object.values(parsed)[0];
      if (first) return String(first);
    } catch (_) {
      // Mantém compatibilidade com projetos que ainda usam a chave legada.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = getServerKey();
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, message: 'Configuração do servidor ausente.' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const cpf = normalizeCpf(body.cpf);
    const dataNascimento = String(body.dataNascimento ?? '');
    const password = String(body.password ?? '');

    if (cpf.length !== 11 || !dataNascimento || password.length < 8) {
      return json({ ok: false, message: 'Informe CPF, data de nascimento e uma senha de pelo menos 8 caracteres.' }, 400);
    }

    const { data: athlete, error: lookupError } = await admin
      .from('atletas')
      .select('id, auth_user_id')
      .eq('cpf', cpf)
      .eq('data_nascimento', dataNascimento)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!athlete) return json({ ok: false, message: 'CPF ou data de nascimento não conferem com o cadastro.' }, 404);
    if (athlete.auth_user_id) return json({ ok: false, message: 'Este cadastro já possui acesso. Use o login normal.' }, 409);

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: authEmail(cpf),
      password,
      email_confirm: true,
      user_metadata: { role: 'atleta', cpf, legacy_activation: true },
    });
    if (authError || !authData.user) {
      return json({ ok: false, message: 'Já existe um acesso para este CPF ou não foi possível criá-lo.' }, 409);
    }

    const userId = authData.user.id;
    const { data: updated, error: updateError } = await admin
      .from('atletas')
      .update({ auth_user_id: userId })
      .eq('id', athlete.id)
      .is('auth_user_id', null)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      await admin.auth.admin.deleteUser(userId);
      if (updateError) throw updateError;
      return json({ ok: false, message: 'Este cadastro foi ativado em outra sessão. Tente fazer login.' }, 409);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('activate-athlete:', error);
    return json({ ok: false, message: 'Não foi possível ativar o primeiro acesso.' }, 500);
  }
});
