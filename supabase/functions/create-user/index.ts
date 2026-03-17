import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  username: string;
  category: 'engemase_employee' | 'third_party' | 'socios';
  role: 'admin' | 'employee' | 'third_party';
}

function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('already registered') || msg.includes('duplicate key')) return 'Este email ou usuário já está registrado';
  if (msg.includes('Unauthorized')) return 'Não autorizado';
  if (msg.includes('Missing')) return 'Campos obrigatórios não preenchidos';
  return 'Ocorreu um erro ao criar o usuário. Tente novamente.';
}

const VALID_CATEGORIES = ['engemase_employee', 'third_party', 'socios'];
const VALID_ROLES = ['admin', 'employee', 'third_party'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the request has a valid JWT and user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a administradores' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Parse and validate request body
    const body: CreateUserRequest = await req.json();

    if (!body.email || !body.password || !body.fullName || !body.username) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios não preenchidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email) || body.email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate password
    if (body.password.length < 8 || body.password.length > 128) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter entre 8 e 128 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate username
    const usernameRegex = /^[a-z0-9.]{3,30}$/;
    if (!usernameRegex.test(body.username)) {
      return new Response(
        JSON.stringify({ error: 'Nome de usuário deve ter 3-30 caracteres (letras minúsculas, números e ponto)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate fullName
    if (body.fullName.trim().length < 2 || body.fullName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Nome completo deve ter entre 2 e 100 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate category and role
    if (!VALID_CATEGORIES.includes(body.category)) {
      return new Response(
        JSON.stringify({ error: 'Categoria inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (!VALID_ROLES.includes(body.role)) {
      return new Response(
        JSON.stringify({ error: 'Função inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName.trim(),
        username: body.username,
        category: body.category,
        role: body.role,
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: sanitizeError(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
