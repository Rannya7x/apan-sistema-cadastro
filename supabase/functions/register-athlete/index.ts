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
    const password = String(body.password ?? '');
    const nomeCompleto = String(body.nomeCompleto ?? '').trim();
    const dataNascimento = String(body.dataNascimento ?? '').trim();
    const emailContato = String(body.emailContato ?? '').trim();

    if (cpf.length !== 11 || !nomeCompleto || !dataNascimento || !emailContato || password.length < 8) {
      return json({ ok: false, message: 'Preencha todos os campos obrigatórios corretamente.' }, 400);
    }

    const { data: existingAthlete, error: lookupError } = await admin
      .from('atletas')
      .select('id')
      .eq('cpf', cpf)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existingAthlete) {
      return json({ ok: false, code: 'CADASTRO_EXISTENTE', message: 'Este CPF já está cadastrado. Use a tela de login.' }, 409);
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: authEmail(cpf),
      password,
      email_confirm: true,
      user_metadata: { role: 'atleta', cpf },
    });
    if (authError || !authData.user) {
      const message = authError?.message?.toLowerCase().includes('already')
        ? 'Já existe um acesso para este CPF. Use a tela de login.'
        : (authError?.message || 'Não foi possível criar o acesso.');
      return json({ ok: false, message }, 409);
    }

    const userId = authData.user.id;
    const athleteRow = {
      auth_user_id: userId,
      nome_completo: nomeCompleto,
      cpf,
      data_nascimento: dataNascimento,
      nome_responsavel: body.nomeResponsavel || null,
      email: emailContato,
      whatsapp: body.whatsapp || null,
      modulo: body.modulo || null,
      possui_deficiencia: body.possuiDeficiencia || 'nao',
      tipo_deficiencia: body.tipoDeficiencia || 'Não possui',
      possui_equipamentos: body.possuiEquipamentos || 'nao',
      qual_equipamento: body.qualEquipamento || null,
      foto_url: null,
    };

    const { data: athlete, error: insertError } = await admin
      .from('atletas')
      .insert(athleteRow)
      .select('id')
      .single();

    if (insertError) {
      await admin.auth.admin.deleteUser(userId);
      throw insertError;
    }

    return json({ ok: true, atletaId: athlete.id }, 201);
  } catch (error) {
    console.error('register-athlete:', error);
    return json({ ok: false, message: 'Não foi possível concluir o cadastro.' }, 500);
  }
});
