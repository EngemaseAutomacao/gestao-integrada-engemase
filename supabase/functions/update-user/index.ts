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
  category: 'engemase_employee' | 'third_party' | 'socios';
  role: 'admin' | 'employee' | 'third_party';
}

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
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const body: UpdateUserRequest = await req.json();
    console.log('Updating user:', body.userId);

    if (!body.userId || !body.fullName || !body.email || !body.username) {
      throw new Error('Missing required fields');
    }

    // Update auth user email and metadata
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      body.userId,
      {
        email: body.email,
        user_metadata: {
          full_name: body.fullName,
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

    // Update profile (using service role bypasses RLS and trigger)
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: body.fullName,
        email: body.email,
        username: body.username,
        category: body.category,
        role: body.role,
      })
      .eq('id', body.userId);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      throw profileUpdateError;
    }

    console.log('User updated successfully:', body.userId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-user function:', error);
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
