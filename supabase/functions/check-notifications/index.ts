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

    // Record timestamp before running checks
    const checkStartTime = new Date().toISOString()

    // Run all notification checks
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

    // Now send push notifications for any notifications created during this run
    const { data: newNotifications, error: fetchError } = await supabaseClient
      .from('notifications')
      .select('id, user_id, title, message, type, tool_id, checkout_id')
      .gte('created_at', checkStartTime)
      .not('message', 'is', null)
      .neq('message', '')

    if (fetchError) {
      console.error('Error fetching new notifications:', fetchError)
    }

    let pushSentCount = 0

    if (newNotifications && newNotifications.length > 0) {
      console.log(`Found ${newNotifications.length} new notifications to push`)

      // Get all unique user IDs
      const userIds = [...new Set(newNotifications.map(n => n.user_id))]

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
        for (const notif of newNotifications) {
          const userSubs = subsByUser.get(notif.user_id)
          if (!userSubs || userSubs.length === 0) continue

          // Skip if message is empty
          if (!notif.message || notif.message.trim() === '') continue

          try {
            // Call send-push-notification edge function for each notification
            const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                subscription: {
                  endpoint: userSubs[0].endpoint,
                  keys: {
                    p256dh: userSubs[0].p256dh,
                    auth: userSubs[0].auth,
                  }
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

            // Send to additional subscriptions for the same user
            for (let i = 1; i < userSubs.length; i++) {
              try {
                await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    subscription: {
                      endpoint: userSubs[i].endpoint,
                      keys: {
                        p256dh: userSubs[i].p256dh,
                        auth: userSubs[i].auth,
                      }
                    },
                    title: notif.title,
                    body: notif.message,
                    tag: notif.id,
                    data: {
                      notificationId: notif.id,
                      type: notif.type,
                    },
                  }),
                })
              } catch (e) {
                console.error(`Push to extra sub failed:`, e)
              }
            }
          } catch (error) {
            console.error(`Error sending push for notification ${notif.id}:`, error)
          }
        }
      }
    }

    console.log(`All checks completed. Push sent: ${pushSentCount}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification checks completed',
        newNotifications: newNotifications?.length || 0,
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