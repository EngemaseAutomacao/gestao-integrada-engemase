import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function sanitizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('already registered') || msg.includes('duplicate key')) return 'Este email já está registrado';
  if (msg.includes('not found')) return 'Perfil não encontrado';
  return 'Ocorreu um erro ao sincronizar o usuário. Tente novamente.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate secret key
    const expectedSecret = Deno.env.get('SYNC_USER_SECRET_KEY');
    if (!expectedSecret || body.secretKey !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    if (!body.profileId || !body.password) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios não preenchidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (body.password.length < 8 || body.password.length > 128) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter entre 8 e 128 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', body.profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const { data: getUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(body.profileId);
    const existingUser = getUserData?.user ?? null;

    if (existingUser && !getUserError) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: body.password }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }

      const authEmail = existingUser.email ?? null;
      if (authEmail && profile.email !== authEmail) {
        const { error: syncEmailError } = await supabaseAdmin
          .from('profiles')
          .update({ email: authEmail })
          .eq('id', profile.id);
        if (syncEmailError) {
          console.error('Error syncing profile email:', syncEmailError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'password_updated',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: profile.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        username: profile.username,
        category: profile.category,
        role: profile.role,
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    await supabaseAdmin.from('tools').update({ created_by: authData.user.id }).eq('created_by', body.profileId);
    await supabaseAdmin.from('tool_checkouts').update({ user_id: authData.user.id }).eq('user_id', body.profileId);
    await supabaseAdmin.from('tool_checkouts').update({ checked_out_by: authData.user.id }).eq('checked_out_by', body.profileId);
    await supabaseAdmin.from('tool_checkouts').update({ checked_in_by: authData.user.id }).eq('checked_in_by', body.profileId);
    await supabaseAdmin.from('tool_issues').update({ reported_by: authData.user.id }).eq('reported_by', body.profileId);
    await supabaseAdmin.from('tool_issues').update({ resolved_by: authData.user.id }).eq('resolved_by', body.profileId);
    await supabaseAdmin.from('maintenance_records').update({ performed_by: authData.user.id }).eq('performed_by', body.profileId);
    await supabaseAdmin.from('notifications').update({ user_id: authData.user.id }).eq('user_id', body.profileId);
    await supabaseAdmin.from('user_roles').update({ user_id: authData.user.id }).eq('user_id', body.profileId);

    await supabaseAdmin.from('profiles').delete().eq('id', body.profileId);

    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: profile.full_name,
        username: profile.username,
        category: profile.category,
        role: profile.role,
        approved: true
      })
      .eq('id', authData.user.id);

    if (profile.role === 'admin') {
      await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: authData.user.id,
          role: 'admin'
        }, { onConflict: 'user_id,role' });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: 'user_created',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-user function:', error);
    return new Response(
      JSON.stringify({ error: sanitizeError(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
