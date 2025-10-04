import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdatePasswordRequest {
  userId: string;
  newPassword: string;
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

    // Verify the request has a valid JWT and user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User verification failed:', userError);
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Admin check failed:', profileError);
      throw new Error('Unauthorized: Admin access required');
    }

    // Parse request body
    const body: UpdatePasswordRequest = await req.json();
    console.log('Updating password for user:', body.userId);

    // Validate required fields
    if (!body.userId || !body.newPassword) {
      throw new Error('Missing required fields: userId, newPassword');
    }

    // Validate password length
    if (body.newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      body.userId,
      { password: body.newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      throw updateError;
    }

    console.log('Password updated successfully for user:', body.userId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-user-password function:', error);
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
