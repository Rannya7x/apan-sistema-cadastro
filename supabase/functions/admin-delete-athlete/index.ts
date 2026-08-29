import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


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
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !serviceRoleKey || !authorization) {
    return json({ ok: false, message: 'Não autorizado.' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const jwt = authorization.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json({ ok: false, message: 'Sessão inválida.' }, 401);

    const { data: adminProfile, error: adminError } = await admin
      .from('administradores')
      .select('id')
      .eq('auth_user_id', userData.user.id)
      .eq('ativo', true)
      .maybeSingle();
    if (adminError || !adminProfile) return json({ ok: false, message: 'Sem permissão administrativa.' }, 403);

    const body = await req.json();
    const athleteId = String(body.athleteId ?? '');
    if (!athleteId) return json({ ok: false, message: 'Atleta não informado.' }, 400);

    const { data: athlete, error: athleteError } = await admin
      .from('atletas')
      .select('id, auth_user_id, foto_url')
      .eq('id', athleteId)
      .maybeSingle();
    if (athleteError) throw athleteError;
    if (!athlete) return json({ ok: false, message: 'Cadastro não encontrado.' }, 404);

    const { data: docs } = await admin
      .from('documentos_atletas')
      .select('foto_url, rg_cpf_url, comprovante_residencia_url, cartao_sus_url, laudo_medico_url')
      .eq('atleta_id', athleteId)
      .maybeSingle();

    const storageTargets: Record<string, string[]> = {
      'fotos-atletas': [],
      'documentos-atletas': [],
    };

    function collectStoragePath(urlValue: unknown) {
      if (!urlValue) return;
      try {
        const url = new URL(String(urlValue));
        for (const bucket of Object.keys(storageTargets)) {
          const marker = `/storage/v1/object/public/${bucket}/`;
          const index = url.pathname.indexOf(marker);
          if (index >= 0) {
            const path = decodeURIComponent(url.pathname.slice(index + marker.length));
            if (path) storageTargets[bucket].push(path);
          }
        }
      } catch (_) {
        // URLs antigas inválidas não impedem a exclusão do cadastro.
      }
    }

    collectStoragePath(athlete.foto_url);
    if (docs) Object.values(docs).forEach(collectStoragePath);

    for (const [bucket, paths] of Object.entries(storageTargets)) {
      if (paths.length) {
        const { error: storageError } = await admin.storage.from(bucket).remove([...new Set(paths)]);
        if (storageError) console.warn(`Falha ao remover arquivos de ${bucket}:`, storageError.message);
      }
    }

    // Remove tabelas filhas explicitamente para funcionar mesmo se FKs antigas
    // ainda não estiverem configuradas com ON DELETE CASCADE.
    for (const table of ['uniformes_atletas', 'saude_autonomia', 'documentos_atletas', 'socioeconomico']) {
      const { error } = await admin.from(table).delete().eq('atleta_id', athleteId);
      if (error && !String(error.message).includes('does not exist')) throw error;
    }

    const { error: deleteAthleteError } = await admin.from('atletas').delete().eq('id', athleteId);
    if (deleteAthleteError) throw deleteAthleteError;

    if (athlete.auth_user_id) {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(athlete.auth_user_id);
      if (deleteUserError) throw deleteUserError;
    }

    return json({ ok: true });
  } catch (error) {
    console.error('admin-delete-athlete:', error);
    return json({ ok: false, message: 'Não foi possível apagar o cadastro completamente.' }, 500);
  }
});
