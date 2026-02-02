import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncUserRequest {
  profileId: string;
  password: string;
  secretKey: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: SyncUserRequest = await req.json();

    // Simple secret key check for one-time use
    if (body.secretKey !== 'ENGEMASE_SYNC_2024') {
      return new Response(
        JSON.stringify({ error: 'Invalid secret key' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

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

    console.log('Looking for profile:', body.profileId);

    // Get profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', body.profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('Found profile:', profile.email);

    // Check if auth user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = users.find(u => u.id === body.profileId);
    
    if (existingUser) {
      // User exists, just update password
      console.log('User exists, updating password');
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: body.password }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, action: 'password_updated' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // User doesn't exist in auth, create with same ID
    console.log('User does not exist in auth, creating...');
    
    // We can't create a user with a specific ID, so we need a different approach
    // Create a new auth user and update the profile's foreign keys
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

    console.log('Created auth user:', authData.user.id);
    console.log('Need to update profile and related tables from old ID', body.profileId, 'to new ID', authData.user.id);

    // Update all related tables with the new user ID
    // First, update tools created_by
    await supabaseAdmin
      .from('tools')
      .update({ created_by: authData.user.id })
      .eq('created_by', body.profileId);

    // Update tool_checkouts
    await supabaseAdmin
      .from('tool_checkouts')
      .update({ user_id: authData.user.id })
      .eq('user_id', body.profileId);

    await supabaseAdmin
      .from('tool_checkouts')
      .update({ checked_out_by: authData.user.id })
      .eq('checked_out_by', body.profileId);

    await supabaseAdmin
      .from('tool_checkouts')
      .update({ checked_in_by: authData.user.id })
      .eq('checked_in_by', body.profileId);

    // Update tool_issues
    await supabaseAdmin
      .from('tool_issues')
      .update({ reported_by: authData.user.id })
      .eq('reported_by', body.profileId);

    await supabaseAdmin
      .from('tool_issues')
      .update({ resolved_by: authData.user.id })
      .eq('resolved_by', body.profileId);

    // Update maintenance_records
    await supabaseAdmin
      .from('maintenance_records')
      .update({ performed_by: authData.user.id })
      .eq('performed_by', body.profileId);

    // Update notifications
    await supabaseAdmin
      .from('notifications')
      .update({ user_id: authData.user.id })
      .eq('user_id', body.profileId);

    // Update user_roles
    await supabaseAdmin
      .from('user_roles')
      .update({ user_id: authData.user.id })
      .eq('user_id', body.profileId);

    // Now delete the old profile and create new one with the auth user ID
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', body.profileId);

    // The new profile should be created automatically by the trigger
    // But let's make sure it has the right data
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

    // Add admin role if needed
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
        newUserId: authData.user.id,
        message: 'User created and data migrated'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-user function:', error);
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
