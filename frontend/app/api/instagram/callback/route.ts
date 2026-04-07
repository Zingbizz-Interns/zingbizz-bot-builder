// app/api/instagram/callback/route.ts
// Handles Instagram OAuth callback via Facebook OAuth dialog.
// Flow: code → FB user token → find FB Page + linked IG account
//       → auto-subscribe page to webhooks → create approval request

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAuthorizedBotAccess } from '@/lib/botAccess'
import {
  isMissingPlatformApprovalSchemaError,
  submitPlatformConnectionRequest,
  upsertPlatformConfigFromPayload,
} from '@/lib/platformApproval'

const APP_ID       = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!
const APP_SECRET   = process.env.INSTAGRAM_APP_SECRET!
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL!
const REDIRECT_URI = `${APP_URL}/api/instagram/callback`

function revalidatePlatformSurface(botId: string, customerId: string) {
  revalidatePath('/dashboard/bots')
  revalidatePath(`/dashboard/bots/${botId}/platforms`)
  revalidatePath(`/dashboard/bots/${botId}/test`)
  revalidatePath('/dashboard/super-admin')
  revalidatePath('/dashboard/super-admin/customers')
  revalidatePath(`/dashboard/super-admin/customers/${customerId}`)
  revalidatePath('/dashboard/super-admin/platform-approvals')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // ── User denied / cancelled ───────────────────────────────────
  if (error) {
    const desc = searchParams.get('error_description') ?? error
    return NextResponse.redirect(`${APP_URL}/dashboard?ig_error=${encodeURIComponent(desc)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard?ig_error=missing_params`)
  }

  // ── Decode state → botId ──────────────────────────────────────
  let botId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
    botId = decoded.botId
    if (!botId) throw new Error('no botId')
  } catch {
    return NextResponse.redirect(`${APP_URL}/dashboard?ig_error=invalid_state`)
  }

  const redirectBase = `${APP_URL}/dashboard/bots/${botId}/platforms`
  const access = await getAuthorizedBotAccess(botId)
  if (!access || !access.canEdit) {
    return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent('You do not have permission to connect Instagram for this bot.')}`)
  }

  try {
    // ── Step 1: Exchange code → Facebook user access token ────────
    const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     APP_ID,
        client_secret: APP_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      const msg = tokenData.error.message ?? 'token_exchange_failed'
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(msg)}`)
    }

    const userAccessToken: string = tokenData.access_token

    // ── Step 2: Get Facebook Pages the user manages ───────────────
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`,
      { cache: 'no-store' }
    )
    const pagesData = await pagesRes.json()

    if (pagesData.error) {
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(pagesData.error.message ?? 'failed_to_fetch_pages')}`)
    }

    const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data ?? []

    if (pages.length === 0) {
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent('No Facebook Pages found. Connect a Facebook Page to your Instagram Business account first.')}`)
    }

    // ── Step 3: Find page with a linked Instagram Business Account ─
    let facebookPageId: string | null      = null
    let pageAccessToken: string | null     = null
    let instagramAccountId: string | null  = null
    let instagramUsername: string | null   = null

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        { cache: 'no-store' }
      )
      const igData = await igRes.json()

      if (igData.instagram_business_account?.id) {
        facebookPageId     = page.id           // used for webhook routing (entry.id)
        pageAccessToken    = page.access_token  // used for sending messages
        instagramAccountId = igData.instagram_business_account.id

        // Fetch @username for display
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,name&access_token=${page.access_token}`,
            { cache: 'no-store' }
          )
          const profile = await profileRes.json()
          instagramUsername = profile.username ?? profile.name ?? null
        } catch {
          // non-fatal
        }
        break
      }
    }

    if (!facebookPageId || !pageAccessToken) {
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent('No Instagram Business Account found linked to your Facebook Page.')}`)
    }

    // ── Step 4: Auto-subscribe the page to webhooks ───────────────
    // This makes Meta send Instagram DM events to our backend webhook
    // without the user ever touching Meta Dev Portal.
    await fetch(
      `https://graph.facebook.com/v18.0/${facebookPageId}/subscribed_apps?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'messages,messaging_postbacks,messaging_optins',
        }),
      }
    )
    // Non-fatal — subscription may already exist or app-level webhook may handle it

    const displayName = instagramUsername ?? instagramAccountId ?? 'Instagram'
    const payload = {
      platform: 'instagram' as const,
      page_id: instagramAccountId,          // IG account ID — matches entry.id in webhooks
      access_token: pageAccessToken,        // Page access token — used for sending messages
      verify_token: '',                     // Not needed — webhook is app-level in Meta
      phone_number_id: null,
      waba_id: null,
      session_expiry_ms: 600000,
      warning_time_ms: 120000,
      warning_message: 'Your session will expire soon. Please respond to continue.',
      source: 'instagram_oauth',
      instagram_username: instagramUsername,
      facebook_page_id: facebookPageId,
    }

    try {
      await submitPlatformConnectionRequest({
        botId,
        customerId: access.customerId,
        requestedBy: access.userId,
        payload,
      })

      revalidatePlatformSurface(botId, access.customerId)

      return NextResponse.redirect(
        `${redirectBase}?ig_request_submitted=${encodeURIComponent(displayName)}`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create Instagram approval request'

      if (!isMissingPlatformApprovalSchemaError(message)) {
        return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(message)}`)
      }

      try {
        await upsertPlatformConfigFromPayload(botId, payload)
        revalidatePlatformSurface(botId, access.customerId)

        return NextResponse.redirect(
          `${redirectBase}?ig_connected=${encodeURIComponent(displayName)}`
        )
      } catch (directSaveError) {
        const directMessage =
          directSaveError instanceof Error ? directSaveError.message : 'Failed to save Instagram configuration'
        return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(directMessage)}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unexpected_error'
    return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(msg)}`)
  }
}
