'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ChevronRight,
  Copy, Check, AlertTriangle, ExternalLink,
  Building2, Phone, KeyRound, Webhook, BookOpen, CreditCard, BadgeCheck,
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
      className="inline-flex items-center gap-1 px-2 py-1 border border-black/20 text-black/50 hover:text-[#000000] hover:border-black/50 transition-colors text-[10px] font-bold uppercase tracking-widest"
    >
      {copied ? <Check className="w-3 h-3 text-[#FFD93D]" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div className="mt-2">
      {label && <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">{label}</p>}
      <div className="flex items-center gap-2 bg-black px-3 py-2.5 border border-black">
        <code className="text-xs text-[#FFD93D] font-mono flex-1 break-all">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 bg-[#FFD93D]/15 border-l-4 border-[#FFD93D] px-3 py-2.5 mt-3">
      <AlertTriangle className="w-3.5 h-3.5 text-[#FFD93D] shrink-0 mt-0.5" strokeWidth={2.5} />
      <p className="text-xs font-medium text-black/80 leading-relaxed">{children}</p>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#FFD93D]/20 border border-[#FFD93D]/50 text-[#000000] text-[10px] font-bold px-1.5 py-0.5 mx-0.5">
      {children}
    </span>
  )
}

function SubStep({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="w-5 h-5 shrink-0 rounded-full border-4 border-black/20 flex items-center justify-center text-[10px] font-black text-black/40 mt-0.5">
        {num}
      </span>
      <div className="flex-1 text-sm font-medium text-black/70 leading-relaxed">{children}</div>
    </div>
  )
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#FF6B6B] font-bold text-xs hover:underline"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  )
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-xs text-black/70 font-medium">
      <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-[#FFD93D]" strokeWidth={2.5} />
      {children}
    </li>
  )
}

// ─── Step content ──────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 1,
    icon: Building2,
    title: 'Prerequisites',
    summary: 'Accounts and assets you need before starting.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          You need a <strong>Meta Business Manager account</strong>. Create one free at{' '}
          <DocLink href="https://business.facebook.com">business.facebook.com</DocLink> if you don&apos;t have one.
        </SubStep>
        <SubStep num={2}>
          You need a <strong>phone number that is not already registered on WhatsApp</strong> — personal or a new SIM/VoIP number. It must be able to receive an SMS or voice call for verification.
        </SubStep>
        <SubStep num={3}>
          You need a <strong>Meta Developer account</strong> at{' '}
          <DocLink href="https://developers.facebook.com">developers.facebook.com</DocLink>.
        </SubStep>
        <Note>
          The phone number cannot already be active on WhatsApp (personal or business). If it is, you must delete that account first before using it with the Cloud API.
        </Note>
      </div>
    ),
  },
  {
    id: 2,
    icon: Building2,
    title: 'Create a Meta App & Add WhatsApp',
    summary: 'Set up a Business-type app and enable the WhatsApp product.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          Go to <DocLink href="https://developers.facebook.com/apps">developers.facebook.com/apps</DocLink> → click <Pill>Create App</Pill> → select type <Pill>Business</Pill>.
        </SubStep>
        <SubStep num={2}>
          Enter an <strong>App Name</strong> and <strong>Contact Email</strong>, attach your <strong>Business Manager</strong> account, then click <Pill>Create App</Pill>.
        </SubStep>
        <SubStep num={3}>
          On the app dashboard, find the <strong>WhatsApp</strong> product card and click <Pill>Set up</Pill>. WhatsApp will appear in the left sidebar.
        </SubStep>
        <SubStep num={4}>
          You will be prompted to select or create a <strong>WhatsApp Business Account (WABA)</strong>. Create a new one if this is your first time. Note the WABA ID shown — you&apos;ll need it later.
        </SubStep>
        <Note>
          Your app must be of type <strong>Business</strong>. Consumer or other types do not support WhatsApp Cloud API.
        </Note>
      </div>
    ),
  },
  {
    id: 3,
    icon: Phone,
    title: 'Add & Verify Your Phone Number',
    summary: 'Register the phone number that will send and receive WhatsApp messages.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          In the left sidebar, go to <Pill>WhatsApp → Phone Numbers</Pill> → click <Pill>Add Phone Number</Pill>.
        </SubStep>
        <SubStep num={2}>
          Enter your phone number with country code (e.g. <code className="bg-[#FFFDF5] px-1 text-xs font-mono">+91 98765 43210</code>). Choose to verify via <strong>SMS</strong> or <strong>Voice call</strong>.
        </SubStep>
        <SubStep num={3}>
          Enter the 6-digit OTP you receive. Once verified, the phone number is registered and a <strong>Phone Number ID</strong> is generated.
        </SubStep>
        <SubStep num={4}>
          Copy your <strong>Phone Number ID</strong> from <Pill>WhatsApp → API Setup</Pill> — it appears next to your phone number (e.g. <code className="bg-[#FFFDF5] px-1 text-xs font-mono">1234567890</code>).
        </SubStep>
        <Note>
          The test phone number Meta provides in the sandbox is free to use but can only send messages to numbers you&apos;ve manually added as testers. Use your own number for production.
        </Note>
      </div>
    ),
  },
  {
    id: 4,
    icon: KeyRound,
    title: 'Generate a Permanent Access Token',
    summary: 'Create a System User token that never expires — required for production.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          Go to <DocLink href="https://business.facebook.com/settings/system-users">Business Manager → Business Settings → Users → System Users</DocLink> and click <Pill>Add</Pill>.
        </SubStep>
        <SubStep num={2}>
          Give the system user a name (e.g. <code className="bg-[#FFFDF5] px-1 text-xs font-mono">whatsapp-bot</code>), set role to <Pill>Admin</Pill>, and click <Pill>Create system user</Pill>.
        </SubStep>
        <SubStep num={3}>
          Click <Pill>Assign Assets</Pill> → select <strong>Apps</strong> → find your Meta app → enable <Pill>Full control</Pill> → save.
        </SubStep>
        <SubStep num={4}>
          Click <Pill>Assign Assets</Pill> again → select <strong>WhatsApp Accounts</strong> → find your WABA → enable <Pill>Full control</Pill> → save.
        </SubStep>
        <SubStep num={5}>
          Click <Pill>Generate New Token</Pill> → select your app → set expiry to <Pill>Never</Pill> → check both:
          <ul className="mt-2 space-y-1 pl-2">
            <CheckItem><code className="bg-[#FFFDF5] px-1 text-xs font-mono">whatsapp_business_messaging</code></CheckItem>
            <CheckItem><code className="bg-[#FFFDF5] px-1 text-xs font-mono">whatsapp_business_management</code></CheckItem>
          </ul>
        </SubStep>
        <SubStep num={6}>
          Click <Pill>Generate Token</Pill> and <strong>copy it immediately</strong> — it won&apos;t be shown again. Paste it into the <em>Access Token</em> field in Zingbizz.
        </SubStep>
        <Note>
          The temporary token on the API Setup page expires in 24 hours — do not use it for production. Always generate a permanent System User token.
        </Note>
      </div>
    ),
  },
  {
    id: 5,
    icon: Webhook,
    title: 'Set Up the Webhook',
    summary: 'Point Meta to your Zingbizz backend so messages are delivered.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          In your Meta App, go to <Pill>WhatsApp → Configuration</Pill> and scroll to the <strong>Webhook</strong> section. Click <Pill>Edit</Pill>.
        </SubStep>
        <SubStep num={2}>
          Set the <strong>Callback URL</strong> to your Zingbizz backend webhook endpoint — your backend URL + <code className="bg-[#FFFDF5] px-1 text-xs font-mono">/webhook/whatsapp</code>:
          <CodeBlock value="https://your-backend.vercel.app/webhook/whatsapp" label="Webhook Callback URL (replace with your backend URL)" />
        </SubStep>
        <SubStep num={3}>
          Set the <strong>Verify Token</strong> to any secret string you choose (e.g. <code className="bg-[#FFFDF5] px-1 text-xs font-mono">zingbizz_wa_verify_123</code>). Paste this exact value into the <em>Webhook Verify Token</em> field in Zingbizz.
        </SubStep>
        <SubStep num={4}>
          Click <Pill>Verify and save</Pill>. Meta will ping your backend to confirm it responds correctly.
        </SubStep>
        <SubStep num={5}>
          After saving, click <Pill>Manage</Pill> next to Webhook fields and subscribe to <strong>messages</strong> so incoming WhatsApp messages are forwarded to your bot.
        </SubStep>
        <Note>
          The webhook URL must be publicly accessible HTTPS. Local dev URLs won&apos;t work — use ngrok or deploy first. The verify token must match exactly what is set in Zingbizz.
        </Note>
      </div>
    ),
  },
  {
    id: 6,
    icon: CreditCard,
    title: 'Enable Billing',
    summary: 'Add a payment method to send messages beyond the free tier.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          Go to <DocLink href="https://business.facebook.com/settings/billing">Business Manager → Settings → Billing</DocLink>.
        </SubStep>
        <SubStep num={2}>
          Click <Pill>Add payment method</Pill> and add a valid credit/debit card or supported payment method for your region.
        </SubStep>
        <SubStep num={3}>
          WhatsApp Cloud API uses a <strong>conversation-based pricing model</strong>. You are billed per 24-hour conversation window, not per message. The first 1,000 conversations per month are free.
        </SubStep>
        <Note>
          Without a billing method, your messages will fail once you exceed the free tier. Add billing before going live to avoid interruptions.
        </Note>
      </div>
    ),
  },
  {
    id: 7,
    icon: BadgeCheck,
    title: 'Go to Production',
    summary: 'Verify your business, get display name approval, and create message templates.',
    content: (
      <div className="space-y-1">
        <SubStep num={1}>
          <strong>Business Verification:</strong> Go to <Pill>Business Settings → Security Center</Pill> → click <Pill>Start Verification</Pill>. Submit your legal business name, registration documents, and address. Approval typically takes 1–48 hours.
        </SubStep>
        <SubStep num={2}>
          <strong>Display Name Approval:</strong> Go to <Pill>WhatsApp → Phone Numbers</Pill> → click on your number → edit <strong>Display Name</strong>. This is the name customers see. Must match your verified business name. Usually approved within 24 hours.
        </SubStep>
        <SubStep num={3}>
          <strong>Message Templates:</strong> For outbound messages (outside the 24-hour window), you must use pre-approved templates. Create them at <DocLink href="https://business.facebook.com/wa/manage/message-templates/">WhatsApp Manager → Message Templates</DocLink>.
          <ul className="mt-2 space-y-1 pl-2">
            <CheckItem>Category: <strong>Marketing</strong> (promotions), <strong>Utility</strong> (transactional), or <strong>Authentication</strong> (OTPs)</CheckItem>
            <CheckItem>Use <code className="bg-[#FFFDF5] px-1 text-xs font-mono">{'{{1}}'}</code>, <code className="bg-[#FFFDF5] px-1 text-xs font-mono">{'{{2}}'}</code> for dynamic fields</CheckItem>
            <CheckItem>Approval is usually instant with a verified business</CheckItem>
          </ul>
        </SubStep>
        <SubStep num={4}>
          <strong>Production checklist before going live:</strong>
          <ul className="mt-2 space-y-1 pl-2">
            <CheckItem>Business verified</CheckItem>
            <CheckItem>Display name approved</CheckItem>
            <CheckItem>Billing method added</CheckItem>
            <CheckItem>Permanent access token generated (never-expiring)</CheckItem>
            <CheckItem>Webhook live and subscribed to <code className="bg-[#FFFDF5] px-1 text-xs font-mono">messages</code></CheckItem>
            <CheckItem>At least one approved message template</CheckItem>
          </ul>
        </SubStep>
        <Note>
          Within a 24-hour window after a customer messages you first, you can reply freely with any text. After 24 hours, only approved templates can be sent to re-initiate the conversation.
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
    <div className={`border-2 transition-colors ${open ? 'border-black' : 'border-black/20 hover:border-black/50'}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-7 h-7 shrink-0 flex items-center justify-center border-2 font-black text-xs transition-colors ${open ? 'bg-[#FFD93D] border-[#FFD93D] text-black' : 'border-black/30 text-black/40'}`}>
          {step.id}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-black' : 'text-black/30'}`} strokeWidth={2} />
          <div className="min-w-0">
            <p className={`text-xs font-black uppercase tracking-widest transition-colors ${open ? 'text-black' : 'text-black/60'}`}>
              {step.title}
            </p>
            {!open && (
              <p className="text-[10px] font-medium text-black/40 truncate">{step.summary}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-black/30">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t-2 border-black/10">
          <p className="text-xs font-medium text-black/50 mb-3">{step.summary}</p>
          {step.content}
        </div>
      )}
    </div>
  )
}

// ─── Standalone steps list (used by the dedicated guide page) ─────────────────

export function WhatsAppSetupSteps() {
  return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-white overflow-hidden">
      <div className="divide-y-2 divide-[#000000]/10">
        {STEPS.map((step) => (
          <StepCard key={step.id} step={step} defaultOpen />
        ))}
      </div>
      <div className="px-6 py-4 bg-[#FFFDF5] border-t-2 border-black flex items-center justify-between">
        <p className="text-[10px] font-medium text-black/40">
          Based on Meta WhatsApp Cloud API docs — v18.0
        </p>
        <DocLink href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started">
          Full docs
        </DocLink>
      </div>
    </div>
  )
}

// ─── Compact widget (used inside WhatsAppForm) ─────────────────────────────────

export default function WhatsAppSetupGuide({ botId }: { botId: string }) {
  return (
    <a
      href={`/dashboard/bots/${botId}/platforms/whatsapp-guide`}
      className="flex items-center gap-3 px-4 py-3 border-4 border-black/20 hover:border-black hover:bg-[#FFFDF5] transition-colors group"
    >
      <div className="w-7 h-7 shrink-0 flex items-center justify-center bg-[#FFD93D]/20 border border-[#FFD93D]/50">
        <BookOpen className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-black uppercase tracking-widest text-black">
          How to set up WhatsApp
        </p>
        <p className="text-[10px] font-medium text-black/40 mt-0.5">
          Step-by-step: Meta App → Phone Number → Token → Webhook → Production
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-black/30 group-hover:text-[#000000] transition-colors" />
    </a>
  )
}
