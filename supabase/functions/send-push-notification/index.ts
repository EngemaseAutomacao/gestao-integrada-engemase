import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const { userId, title, body, type, toolId, checkoutId } = await req.json();

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: 'userId and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert notification into database
    // This will trigger the realtime subscription in the frontend
    // which will show the toast, play sound, and show browser notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: body || '',
        type: type || 'return_reminder',
        tool_id: toolId || null,
        checkout_id: checkoutId || null,
        read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create notification: ' + error.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification created and will be delivered via realtime',
        notification: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
