import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BootstrapAdminRequest {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
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

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (checkError) {
      console.error('Error checking for existing admins:', checkError);
      throw new Error('Failed to check for existing admins');
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Bootstrap admin already exists. Use the admin panel to create more admins.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Parse request body
    const body: BootstrapAdminRequest = await req.json();
    console.log('Creating bootstrap admin:', body.email);

    // Validate required fields
    if (!body.email || !body.password || !body.fullName || !body.username) {
      throw new Error('Missing required fields: email, password, fullName, username');
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        username: body.username,
        category: 'engemase_employee',
        role: 'admin',
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    // Update profile to be admin and approved
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'admin',
        category: 'engemase_employee',
        full_name: body.fullName,
        username: body.username,
        approved: true
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    // Add to user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: authData.user.id,
        role: 'admin'
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Error adding role:', roleError);
      // Don't throw, profile is already set as admin
    }

    console.log('Bootstrap admin created successfully:', authData.user.id);

    return new Response(
      JSON.stringify({ success: true, user: { id: authData.user.id, email: authData.user.email } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in bootstrap-admin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
