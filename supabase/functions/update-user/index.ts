import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  userId: string;
  fullName: string;
  email: string;
  username: string;
  company?: string;
  category: 'engemase_employee' | 'third_party' | 'socios';
  role: 'admin' | 'employee' | 'third_party';
}

function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('duplicate key')) return 'Este email ou usuário já está em uso';
  if (msg.includes('Unauthorized') || msg.includes('Admin')) return 'Não autorizado';
  return 'Ocorreu um erro ao atualizar o usuário. Tente novamente.';
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

    const body: UpdateUserRequest = await req.json();

    // Validate required fields
    if (!body.userId || !body.fullName || !body.email || !body.username) {
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
    if (!VALID_CATEGORIES.includes(body.category) || !VALID_ROLES.includes(body.role)) {
      return new Response(
        JSON.stringify({ error: 'Categoria ou função inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate company length
    if (body.company && body.company.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Nome da empresa deve ter no máximo 100 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update auth user email and metadata
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      body.userId,
      {
        email: body.email,
        user_metadata: {
          full_name: body.fullName.trim(),
          username: body.username,
          category: body.category,
          role: body.role,
        },
      }
    );

    if (authUpdateError) {
      console.error('Error updating auth user:', authUpdateError);
      throw authUpdateError;
    }

    // Update profile
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: body.fullName.trim(),
        email: body.email,
        username: body.username,
        company: body.company || null,
        category: body.category,
        role: body.role,
      })
      .eq('id', body.userId);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      throw profileUpdateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-user function:', error);
    return new Response(
      JSON.stringify({ error: sanitizeError(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
