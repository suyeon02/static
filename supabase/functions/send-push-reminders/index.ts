import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'

type Reminder = {
  delivery_id: string
  subscription_id: string
  reminder_kind: 'task_due' | 'event_upcoming'
  record_id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

const PUSH_SERVICE_HOSTS = new Set([
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

function constantTimeEquals(leftValue: string, rightValue: string) {
  const encoder = new TextEncoder()
  const left = encoder.encode(leftValue)
  const right = encoder.encode(rightValue)
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0)
  }
  return difference === 0
}

function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      PUSH_SERVICE_HOSTS.has(url.hostname)
    )
  } catch {
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const cronSecret = Deno.env.get('PUSH_CRON_SECRET')
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  if (!cronSecret || !constantTimeEquals(token, cronSecret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !vapidPublicKey ||
    !vapidPrivateKey ||
    !vapidSubject
  ) {
    console.error('Push reminder function secrets are incomplete.')
    return new Response('Server configuration error', { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.rpc('claim_due_push_reminders', {
    p_limit: 100,
  })
  if (error) {
    console.error('Could not claim due reminders:', error.message)
    return new Response('Could not claim reminders', { status: 500 })
  }

  let sent = 0
  let retried = 0
  let removed = 0
  let processingErrors = 0
  const reminders = (data || []) as Reminder[]

  for (let offset = 0; offset < reminders.length; offset += 10) {
    await Promise.all(
      reminders.slice(offset, offset + 10).map(async (reminder) => {
        const { delivery_id, reminder_kind, endpoint, p256dh, auth_key } = reminder
        if (reminder_kind !== 'task_due' && reminder_kind !== 'event_upcoming') {
          processingErrors += 1
          console.error('Claim returned an unknown reminder type.')
          return
        }

        if (!isAllowedPushEndpoint(endpoint)) {
          const { error: finishError } = await supabase.rpc(
            'finish_push_reminder',
            {
              p_delivery_id: delivery_id,
              p_success: false,
              p_error_code: 'unsupported_push_service',
              p_remove_subscription: true,
            },
          )
          if (finishError) {
            processingErrors += 1
            console.error('Could not remove an unsupported push endpoint.')
          } else {
            removed += 1
          }
          return
        }

        try {
          await webpush.sendNotification(
            { endpoint, keys: { p256dh, auth: auth_key } },
            JSON.stringify({ type: reminder_kind }),
            { TTL: 86400 },
          )
          const { error: finishError } = await supabase.rpc(
            'finish_push_reminder',
            {
              p_delivery_id: delivery_id,
              p_success: true,
              p_error_code: null,
              p_remove_subscription: false,
            },
          )
          if (finishError) throw finishError
          sent += 1
        } catch (sendError) {
          const statusCode = Number(
            (sendError as { statusCode?: number })?.statusCode || 0,
          )
          const removeSubscription = statusCode === 404 || statusCode === 410
          const { error: finishError } = await supabase.rpc(
            'finish_push_reminder',
            {
              p_delivery_id: delivery_id,
              p_success: false,
              p_error_code: statusCode
                ? `push_service_${statusCode}`
                : 'push_delivery_failed',
              p_remove_subscription: removeSubscription,
            },
          )
          if (finishError) {
            processingErrors += 1
            console.error('Could not record a push delivery result:', finishError.message)
            return
          }
          if (removeSubscription) {
            removed += 1
          } else {
            retried += 1
          }
        }
      }),
    )
  }

  return Response.json({
    claimed: reminders.length,
    sent,
    retried,
    removed,
    processingErrors,
  }, { status: processingErrors > 0 ? 500 : 200 })
})
