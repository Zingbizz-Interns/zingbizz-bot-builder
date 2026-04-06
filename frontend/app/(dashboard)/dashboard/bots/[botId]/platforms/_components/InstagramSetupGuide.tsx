'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ChevronRight,
  Copy, Check, AlertTriangle, ExternalLink,
  Building2, Puzzle, Link2, KeyRound, Webhook, ShieldCheck, BookOpen,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  id: number
  icon: React.ElementType
  title: string
  summary: string
  content: React.ReactNode
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 border border-[#121212]/20 text-[#121212]/50 hover:text-[#121212] hover:border-[#121212]/50 transition-colors text-[10px] font-bold uppercase tracking-widest"
    >
      {copied ? <Check className="w-3 h-3 text-[#D02020]" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div className="mt-2">
      {label && <p className="text-[10px] font-bold uppercase tracking-widest text-[#121212]/40 mb-1">{label}</p>}
      <div className="flex items-center gap-2 bg-[#121212] px-3 py-2.5 border border-[#121212]">
        <code className="text-xs text-[#F0C020] font-mono flex-1 break-all">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-[#F0C020]/15 border-l-4 border-[#F0C020] px-3 py-2.5 mt-3">
      <AlertTriangle className="w-3.5 h-3.5 text-[#F0C020] shrink-0 mt-0.5" strokeWidth={2.5} />
      <p className="text-xs font-medium text-[#121212]/80 leading-relaxed">{children}</p>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#D02020]/10 border border-[#D02020]/30 text-[#D02020] text-[10px] font-bold px-1.5 py-0.5 mx-0.5">
      {children}
    </span>
  )
}

function SubStep({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="w-5 h-5 shrink-0 rounded-full border-2 border-[#121212]/20 flex items-center justify-center text-[10px] font-black text-[#121212]/40 mt-0.5">
        {num}
      </span>
      <div className="flex-1 text-sm font-medium text-[#121212]/70 leading-relaxed">{children}</div>
    </div>
  )
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#1040C0] font-bold text-xs hover:underline"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

// ─── Step content ──────────────────────────────────────────────────────────────

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
const oauthCallbackUrl = `${appUrl}/api/instagram/callback`

const STEPS: Step[] = [
  {
    id: 1,
    icon: Building2,
    title: 'Prerequisites',
    summary: 'Ensure your Instagram account is ready for API access.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          Your Instagram account must be a <strong>Business</strong> or <strong>Creator</strong> account — personal accounts have no API access.
          To convert: go to Instagram Settings → Account → Switch to Professional Account.
        </SubStep>
        <SubStep num={2}>
          Your Instagram Business account must be <strong>linked to a Facebook Page</strong> that you admin.
          Link via: Facebook Page → Settings → Linked Accounts → Connect Instagram.
        </SubStep>
        <SubStep num={3}>
          You need a <strong>Meta Developer account</strong>. Sign up free at{' '}
          <DocLink href="https://developers.facebook.com">developers.facebook.com</DocLink>.
        </SubStep>
        <Note>
          Without a linked Facebook Page, the Instagram API is not accessible. This is a hard Meta requirement — there is no workaround.
        </Note>
      </div>
    ),
  },
  {
    id: 2,
    icon: Building2,
    title: 'Create a Meta App',
    summary: 'Set up a new Business-type app on the Meta Developer Portal.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          Go to <DocLink href="https://developers.facebook.com/apps">developers.facebook.com/apps</DocLink> and click <Pill>Create App</Pill>.
        </SubStep>
        <SubStep num={2}>
          When asked for app type, select <Pill>Business</Pill>. This is mandatory — other types do not support Instagram messaging.
        </SubStep>
        <SubStep num={3}>
          Fill in <strong>App Name</strong> (e.g. &quot;My Bot&quot;) and your <strong>Contact Email</strong>, then click <Pill>Create App</Pill>.
        </SubStep>
        <SubStep num={4}>
          After creation, note your <strong>App ID</strong> and <strong>App Secret</strong> from <Pill>App Settings → Basic</Pill>. You&apos;ll need these later.
        </SubStep>
        <Note>
          Meta may ask you to verify your business. Complete this step before submitting for production review — it&apos;s required.
        </Note>
      </div>
    ),
  },
  {
    id: 3,
    icon: Puzzle,
    title: 'Add the Instagram Product',
    summary: 'Enable Instagram messaging inside your Meta App.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          In your app dashboard, scroll to the <strong>Add Products</strong> section and find the <strong>Instagram</strong> card. Click <Pill>Set up</Pill>.
        </SubStep>
        <SubStep num={2}>
          You&apos;ll see two options. Choose <Pill>API setup with Instagram Login</Pill> — this is the modern approach using the Instagram Graph API.
        </SubStep>
        <SubStep num={3}>
          Instagram will now appear in the left sidebar under <strong>Products</strong>. Click it to open the Instagram settings panel.
        </SubStep>
        <SubStep num={4}>
          Under <strong>API setup with Instagram login</strong>, scroll to <strong>Generate access tokens</strong> → click <Pill>Add account</Pill> → authorize your Instagram Business account in the popup.
        </SubStep>
        <Note>
          If you don&apos;t see your Instagram account in the popup, make sure it&apos;s linked to your Facebook Page (Step 1).
        </Note>
      </div>
    ),
  },
  {
    id: 4,
    icon: Link2,
    title: 'Configure the OAuth Redirect URI',
    summary: 'Tell Meta where to send users after they authorize your app.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          In your app dashboard, go to <Pill>Products → Instagram → API setup with Instagram login</Pill>.
        </SubStep>
        <SubStep num={2}>
          Scroll to <strong>Configure Instagram Login</strong> → click <Pill>Edit</Pill> next to <em>Valid OAuth Redirect URIs</em>.
        </SubStep>
        <SubStep num={3}>
          Add the following URL exactly as shown — no trailing slash, no query parameters:
          <CodeBlock value={oauthCallbackUrl} label="Your OAuth Redirect URI" />
        </SubStep>
        <SubStep num={4}>
          Click <Pill>Save changes</Pill>.
        </SubStep>
        <Note>
          This URL must match exactly what Zingbizz sends during the OAuth flow. Any mismatch will cause a redirect_uri_mismatch error.
        </Note>
      </div>
    ),
  },
  {
    id: 5,
    icon: KeyRound,
    title: 'Get Your Account ID & Access Token',
    summary: 'Retrieve the credentials you need to paste into Zingbizz.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          After authorizing your account in Step 3, return to <Pill>API setup → Generate access tokens</Pill>. Your Instagram Business account should appear with a generated token.
        </SubStep>
        <SubStep num={2}>
          Click the <Pill>Copy</Pill> button next to your token. This is your <strong>Access Token</strong>.
        </SubStep>
        <SubStep num={3}>
          Your <strong>Business Account ID</strong> (also called IGID) is the numeric ID shown under your account name (e.g. <code className="bg-[#F0F0F0] px-1 text-xs font-mono">17841401401234567</code>).
        </SubStep>
        <SubStep num={4}>
          Come back to Zingbizz and use <strong>Connect with Instagram</strong> above — this handles the token automatically. Or paste your Account ID and Access Token manually using the manual entry option below.
        </SubStep>
        <Note>
          Access tokens are valid for 60 days. Zingbizz&apos;s OAuth flow exchanges for a long-lived token automatically. If you paste manually, refresh the token before it expires.
        </Note>
      </div>
    ),
  },
  {
    id: 6,
    icon: Webhook,
    title: 'Set Up the Webhook',
    summary: 'Point Meta to your Zingbizz backend so messages are delivered.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          In your Meta App, go to <Pill>Products → Instagram → Webhooks</Pill> (or find it under the <strong>Webhooks</strong> product if listed separately).
        </SubStep>
        <SubStep num={2}>
          Click <Pill>Edit page subscription</Pill> (or <Pill>Add subscriptions</Pill>). You&apos;ll see two fields: Callback URL and Verify Token.
        </SubStep>
        <SubStep num={3}>
          Set the <strong>Callback URL</strong> to your Zingbizz backend webhook endpoint — check your backend deployment URL and append <code className="bg-[#F0F0F0] px-1 text-xs font-mono">/webhook</code>.
          For example:
          <CodeBlock value="https://your-backend.vercel.app/webhook" label="Webhook Callback URL (replace with your backend URL)" />
        </SubStep>
        <SubStep num={4}>
          Set the <strong>Verify Token</strong> to any secret string you like (e.g. <code className="bg-[#F0F0F0] px-1 text-xs font-mono">zingbizz_verify_123</code>). You must paste this same value into the <em>Webhook Verify Token</em> field in Zingbizz.
        </SubStep>
        <SubStep num={5}>
          Click <Pill>Verify and save</Pill>. Meta will ping your backend — it should respond instantly if Zingbizz is deployed.
        </SubStep>
        <SubStep num={6}>
          After verification, enable the <Pill>messages</Pill> subscription field so incoming DMs are forwarded to your bot.
        </SubStep>
        <Note>
          The webhook endpoint must be publicly accessible HTTPS with a valid SSL certificate. Local dev URLs (localhost) won&apos;t work — use a tool like ngrok for local testing.
        </Note>
      </div>
    ),
  },
  {
    id: 7,
    icon: ShieldCheck,
    title: 'Go to Production (App Review)',
    summary: 'Submit your app for Meta review to enable messaging with real users.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          While your app is in <strong>Development mode</strong>, it can only interact with accounts that are admins/testers of the app. To go live you need <strong>Advanced Access</strong> for the messaging permission.
        </SubStep>
        <SubStep num={2}>
          Go to <Pill>App Review → Permissions and Features</Pill>. Find <strong>instagram_business_manage_messages</strong> and click <Pill>Request Advanced Access</Pill>.
        </SubStep>
        <SubStep num={3}>
          Meta requires you to provide for each permission:
          <ul className="mt-2 space-y-1 pl-2">
            {[
              'A clear written description of how your app uses this permission',
              'A screen-recorded video walkthrough showing the full messaging flow (English, with captions)',
              'Step-by-step testing instructions for the Meta review team',
              'A working privacy policy URL (public HTTPS page)',
              'An app icon (1024×1024 PNG)',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#121212]/70 font-medium">
                <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-[#D02020]" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
        </SubStep>
        <SubStep num={4}>
          Submit the review. Meta typically responds within <strong>5 business days</strong>. If rejected, they'll explain why — common issues are vague descriptions or non-working screencasts.
        </SubStep>
        <Note>
          During review, you can still test end-to-end with any Instagram account added as a tester under App Roles → Roles → Add Testers.
        </Note>
      </div>
    ),
  },
]

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({ step, defaultOpen = false }: { step: Step; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = step.icon

  return (
    <div className={`border-2 transition-colors ${open ? 'border-[#121212]' : 'border-[#121212]/20 hover:border-[#121212]/50'}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Step number */}
        <div className={`w-7 h-7 shrink-0 flex items-center justify-center border-2 font-black text-xs transition-colors ${open ? 'bg-[#D02020] border-[#D02020] text-white' : 'border-[#121212]/30 text-[#121212]/40'}`}>
          {step.id}
        </div>

        {/* Icon + title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-[#D02020]' : 'text-[#121212]/30'}`} strokeWidth={2} />
          <div className="min-w-0">
            <p className={`text-xs font-black uppercase tracking-widest transition-colors ${open ? 'text-[#121212]' : 'text-[#121212]/60'}`}>
              {step.title}
            </p>
            {!open && (
              <p className="text-[10px] font-medium text-[#121212]/40 truncate">{step.summary}</p>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-[#121212]/30">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t-2 border-[#121212]/10">
          <p className="text-xs font-medium text-[#121212]/50 mb-3">{step.summary}</p>
          {step.content}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function InstagramSetupGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-2 border-[#121212]/20">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0F0F0] transition-colors text-left"
      >
        <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-[#D02020]/10 border border-[#D02020]/30">
          <BookOpen className="w-3.5 h-3.5 text-[#D02020]" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-[#121212]">
            How to set up Instagram
          </p>
          <p className="text-[10px] font-medium text-[#121212]/40 mt-0.5">
            Step-by-step: Meta App → OAuth → Webhooks → Production
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#121212]/30">
            {STEPS.length} steps
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-[#121212]/40" />
            : <ChevronDown className="w-4 h-4 text-[#121212]/40" />
          }
        </div>
      </button>

      {/* Steps */}
      {open && (
        <div className="border-t-2 border-[#121212]/10">
          {/* Progress bar */}
          <div className="px-4 py-3 bg-[#F0F0F0] border-b border-[#121212]/10 flex items-center gap-3">
            <div className="flex gap-1 flex-1">
              {STEPS.map((s) => (
                <div key={s.id} className="flex-1 h-1 bg-[#D02020]/20 rounded-full" />
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#121212]/40 shrink-0">
              Expand each step
            </span>
          </div>

          {/* Step cards */}
          <div className="divide-y-2 divide-[#121212]/10">
            {STEPS.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-[#F0F0F0] border-t-2 border-[#121212]/10 flex items-center justify-between">
            <p className="text-[10px] font-medium text-[#121212]/40">
              Based on Meta Instagram Platform docs — v25.0
            </p>
            <DocLink href="https://developers.facebook.com/docs/instagram-platform">
              Full docs
            </DocLink>
          </div>
        </div>
      )}
    </div>
  )
}
