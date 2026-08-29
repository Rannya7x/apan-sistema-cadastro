import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizeCpf = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(0, 11);

function getServerKey() {
  const namedKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys);
      if (parsed.default) return String(parsed.default);
      const first = Object.values(parsed)[0];
      if (first) return String(first);
    } catch (_) {
      // Fallback para projetos que ainda usam a chave legada.
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

async function adminEmailExists(admin: ReturnType<typeof createClient>, email: string) {
  const { data: profiles, error: profilesError } = await admin
    .from('administradores')
    .select('auth_user_id')
    .eq('ativo', true);
  if (profilesError) throw profilesError;

  for (const profile of profiles ?? []) {
    const { data, error } = await admin.auth.admin.getUserById(profile.auth_user_id);
    if (error) continue;
    if (String(data.user?.email || '').toLowerCase() === email) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = getServerKey();
  if (!supabaseUrl || !serverKey) return json({ ok: false, message: 'Configuração do servidor ausente.' }, 500);

  const admin = createClient(supabaseUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const mode = String(body.mode ?? '');

    if (mode === 'athlete-cpf') {
      const cpf = normalizeCpf(body.cpf);
      if (cpf.length !== 11) return json({ ok: true, exists: false, hasAccess: false });

      const { data: athlete, error } = await admin
        .from('atletas')
        .select('auth_user_id')
        .eq('cpf', cpf)
        .maybeSingle();
      if (error) throw error;

      return json({
        ok: true,
        exists: !!athlete,
        hasAccess: !!athlete?.auth_user_id,
      });
    }

    if (mode === 'admin-email') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email || !email.includes('@')) return json({ ok: true, exists: false });

      const exists = await adminEmailExists(admin, email);
      return json({ ok: true, exists });
    }

    return json({ ok: false, message: 'Tipo de validação inválido.' }, 400);
  } catch (error) {
    console.error('check-access:', error);
    return json({ ok: false, message: 'Não foi possível validar o acesso.' }, 500);
  }
});
