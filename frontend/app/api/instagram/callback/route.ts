// app/api/instagram/callback/route.ts
// Handles Instagram OAuth callback via Facebook OAuth dialog.
// Flow: code → FB user token → Instagram Business Account ID → save to platform_configs.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

const APP_ID      = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!
const APP_SECRET  = process.env.INSTAGRAM_APP_SECRET!
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL!
const REDIRECT_URI = `${APP_URL}/api/instagram/callback`

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

    // ── Step 2: Get Instagram Business Account linked to the user ─
    // First get the Facebook Pages the user manages
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

    // Find the first page that has an Instagram Business Account connected
    let instagramAccountId: string | null = null
    let instagramUsername: string | null = null
    let pageAccessToken: string = pages[0].access_token

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        { cache: 'no-store' }
      )
      const igData = await igRes.json()

      if (igData.instagram_business_account?.id) {
        instagramAccountId = igData.instagram_business_account.id
        pageAccessToken = page.access_token

        // Fetch username
        try {
          const profileRes = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,name&access_token=${page.access_token}`,
            { cache: 'no-store' }
          )
          const profile = await profileRes.json()
          instagramUsername = profile.username ?? profile.name ?? instagramAccountId
        } catch {
          instagramUsername = instagramAccountId
        }
        break
      }
    }

    if (!instagramAccountId) {
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent('No Instagram Business Account found linked to your Facebook Page.')}`)
    }

    // ── Step 3: Save to platform_configs ─────────────────────────
    const supabase = await createClient()
    const verifyToken = crypto.randomBytes(16).toString('hex')

    const { error: dbError } = await supabase
      .from('platform_configs')
      .upsert(
        {
          bot_id:            botId,
          platform:          'instagram',
          page_id:           instagramAccountId,
          access_token:      pageAccessToken,
          verify_token:      verifyToken,
          phone_number_id:   null,
          waba_id:           null,
          session_expiry_ms: 600000,
          warning_time_ms:   120000,
          warning_message:   'Your session will expire soon. Please respond to continue.',
          is_active:         true,
        },
        { onConflict: 'bot_id,platform' }
      )

    if (dbError) {
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(dbError.message)}`)
    }

    revalidatePath(`/dashboard/bots/${botId}/platforms`)

    return NextResponse.redirect(
      `${redirectBase}?ig_connected=${encodeURIComponent(instagramUsername ?? instagramAccountId)}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unexpected_error'
    return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(msg)}`)
  }
}
