import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting notification checks...')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check for overdue tools
    console.log('Checking overdue tools...')
    const { error: overdueError } = await supabaseClient.rpc('check_overdue_tools')
    if (overdueError) {
      console.error('Error checking overdue tools:', overdueError)
    } else {
      console.log('Overdue tools check completed')
    }

    // Check for low stock
    console.log('Checking low stock...')
    const { error: lowStockError } = await supabaseClient.rpc('check_low_stock')
    if (lowStockError) {
      console.error('Error checking low stock:', lowStockError)
    } else {
      console.log('Low stock check completed')
    }

    // Check for return reminders
    console.log('Checking return reminders...')
    const { error: remindersError } = await supabaseClient.rpc('check_return_reminders')
    if (remindersError) {
      console.error('Error checking return reminders:', remindersError)
    } else {
      console.log('Return reminders check completed')
    }

    // Check for maintenance reminders
    console.log('Checking maintenance reminders...')
    const { error: maintenanceError } = await supabaseClient.rpc('check_maintenance_reminders')
    if (maintenanceError) {
      console.error('Error checking maintenance reminders:', maintenanceError)
    } else {
      console.log('Maintenance reminders check completed')
    }

    // Check for prolonged vehicle use
    console.log('Checking prolonged vehicle use...')
    const { error: vehicleError } = await supabaseClient.rpc('check_prolonged_vehicle_use')
    if (vehicleError) {
      console.error('Error checking prolonged vehicle use:', vehicleError)
    } else {
      console.log('Prolonged vehicle use check completed')
    }

    console.log('All notification checks completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification checks completed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in check-notifications function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})