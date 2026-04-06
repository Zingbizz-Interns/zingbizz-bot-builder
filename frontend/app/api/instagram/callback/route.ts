// app/api/instagram/callback/route.ts
// Handles Instagram OAuth callback — exchanges code for token, saves to platform_configs.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

const APP_ID     = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL!
const REDIRECT_URI = `${APP_URL}/api/instagram/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // ── Instagram denied / cancelled ─────────────────────────────
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
    // ── Step 1: Exchange code → short-lived user access token ────
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
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

    if (tokenData.error_type || tokenData.error) {
      const msg = tokenData.error_message ?? tokenData.error ?? 'token_exchange_failed'
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(msg)}`)
    }

    const shortLivedToken: string = tokenData.access_token
    const instagramUserId: string = String(tokenData.user_id)

    // ── Step 2: Exchange short-lived → long-lived token (60 days) ─
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&access_token=${shortLivedToken}`,
      { cache: 'no-store' }
    )
    const longTokenData = await longTokenRes.json()

    if (longTokenData.error) {
      return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(longTokenData.error.message ?? 'long_token_exchange_failed')}`)
    }

    const accessToken: string = longTokenData.access_token

    // ── Step 3: Fetch account name for display ───────────────────
    let accountName = instagramUserId
    try {
      const profileRes = await fetch(
        `https://graph.instagram.com/v18.0/${instagramUserId}?fields=name,username&access_token=${accessToken}`,
        { cache: 'no-store' }
      )
      const profile = await profileRes.json()
      accountName = profile.username ?? profile.name ?? instagramUserId
    } catch {
      // non-fatal — name is cosmetic only
    }

    // ── Step 4: Save to platform_configs ─────────────────────────
    const supabase = await createClient()
    const verifyToken = crypto.randomBytes(16).toString('hex')

    const { error: dbError } = await supabase
      .from('platform_configs')
      .upsert(
        {
          bot_id:            botId,
          platform:          'instagram',
          page_id:           instagramUserId,
          access_token:      accessToken,
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
      `${redirectBase}?ig_connected=${encodeURIComponent(accountName)}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unexpected_error'
    return NextResponse.redirect(`${redirectBase}?ig_error=${encodeURIComponent(msg)}`)
  }
}
