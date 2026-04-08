import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting notification checks...')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Run all notification checks (these create notifications via RPCs)
    const checks = [
      { name: 'overdue tools', fn: 'check_overdue_tools' },
      { name: 'low stock', fn: 'check_low_stock' },
      { name: 'return reminders', fn: 'check_return_reminders' },
      { name: 'maintenance reminders', fn: 'check_maintenance_reminders' },
      { name: 'prolonged vehicle use', fn: 'check_prolonged_vehicle_use' },
      { name: 'vehicle overdue return', fn: 'check_vehicle_overdue_return' },
    ]

    for (const check of checks) {
      console.log(`Checking ${check.name}...`)
      const { error } = await supabaseClient.rpc(check.fn)
      if (error) {
        console.error(`Error checking ${check.name}:`, error)
      } else {
        console.log(`${check.name} check completed`)
      }
    }

    // Now send push for ANY notifications that haven't been pushed yet
    // This catches notifications created by triggers that pg_net might have failed to push
    const { data: unsentNotifications, error: fetchError } = await supabaseClient
      .from('notifications')
      .select('id, user_id, title, message, type, tool_id, checkout_id')
      .eq('push_sent', false)
      .not('message', 'is', null)
      .neq('message', '')

    if (fetchError) {
      console.error('Error fetching unsent notifications:', fetchError)
    }

    let pushSentCount = 0

    if (unsentNotifications && unsentNotifications.length > 0) {
      console.log(`Found ${unsentNotifications.length} unsent notifications to push`)

      // Get all unique user IDs
      const userIds = [...new Set(unsentNotifications.map(n => n.user_id))]

      // Fetch all push subscriptions for these users
      const { data: allSubscriptions, error: subError } = await supabaseClient
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds)

      if (subError) {
        console.error('Error fetching subscriptions:', subError)
      }

      if (allSubscriptions && allSubscriptions.length > 0) {
        // Group subscriptions by user
        const subsByUser = new Map<string, typeof allSubscriptions>()
        for (const sub of allSubscriptions) {
          const existing = subsByUser.get(sub.user_id) || []
          existing.push(sub)
          subsByUser.set(sub.user_id, existing)
        }

        // Send push for each notification
        const sentIds: string[] = []

        for (const notif of unsentNotifications) {
          const userSubs = subsByUser.get(notif.user_id)
          if (!userSubs || userSubs.length === 0) {
            // No subscription, still mark as sent to avoid retrying forever
            sentIds.push(notif.id)
            continue
          }

          if (!notif.message || notif.message.trim() === '') {
            sentIds.push(notif.id)
            continue
          }

          try {
            // Send to all subscriptions for this user
            for (const sub of userSubs) {
              try {
                const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    subscription: {
                      endpoint: sub.endpoint,
                      keys: { p256dh: sub.p256dh, auth: sub.auth }
                    },
                    title: notif.title,
                    body: notif.message,
                    tag: notif.id,
                    data: {
                      notificationId: notif.id,
                      type: notif.type,
                      toolId: notif.tool_id,
                      checkoutId: notif.checkout_id,
                    },
                  }),
                })

                if (pushResponse.ok) {
                  pushSentCount++
                } else {
                  const errorText = await pushResponse.text()
                  console.error(`Push failed for notification ${notif.id}:`, errorText)
                }
              } catch (e) {
                console.error(`Push to sub failed:`, e)
              }
            }

            sentIds.push(notif.id)
          } catch (error) {
            console.error(`Error sending push for notification ${notif.id}:`, error)
          }
        }

        // Mark all processed notifications as push_sent
        if (sentIds.length > 0) {
          const { error: updateError } = await supabaseClient
            .from('notifications')
            .update({ push_sent: true })
            .in('id', sentIds)

          if (updateError) {
            console.error('Error marking notifications as sent:', updateError)
          } else {
            console.log(`Marked ${sentIds.length} notifications as push_sent`)
          }
        }
      }
    }

    console.log(`All checks completed. Push sent: ${pushSentCount}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification checks completed',
        unsentNotifications: unsentNotifications?.length || 0,
        pushSent: pushSentCount,
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
      JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
