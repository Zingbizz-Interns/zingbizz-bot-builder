'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from '@/lib/actions/auth'
import { MessageSquare, BarChart2, LogOut, Users, Inbox, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/ui/NotificationBell'

interface BotItem {
  id: string
  name: string
  is_active: boolean
}

interface SidebarProps {
  user: { name: string; email: string }
  bots: BotItem[]
  isOwner: boolean
  isSuperAdmin?: boolean
}

export default function Sidebar({ user, bots, isOwner, isSuperAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const botsActive       = pathname.startsWith('/dashboard/bots')
  const analyticsActive  = pathname.startsWith('/dashboard/analytics')
  const teamActive       = pathname.startsWith('/dashboard/team')
  const inboxActive      = pathname.startsWith('/dashboard/inbox')
  const superAdminActive = pathname.startsWith('/dashboard/super-admin')

  const [attentionCount, setAttentionCount] = useState(0)

  useEffect(() => {
    if (!bots.length) return
    const botIds = bots.map(b => b.id)
    const supabase = createClient()

    async function fetchCount() {
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .in('bot_id', botIds)
        .eq('needs_attention', true)
        .neq('status', 'closed')
      setAttentionCount(count ?? 0)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [bots])

  const linkBase =
    'flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-100 border-2'

  const linkActive =
    'bg-[#FFD93D] text-black border-black shadow-[3px_3px_0px_0px_#FFD93D]'

  const linkInactive =
    'text-white/50 border-transparent hover:text-white hover:border-white/30 hover:bg-white/5'

  return (
    <aside className="w-56 bg-black border-4 border-black flex flex-col h-full shrink-0 shadow-[8px_8px_0px_0px_#000]">

      {/* Logo Sticker */}
      <div className="px-5 py-6 border-b-4 border-black bg-[#FFD93D]">
        <div className="border-4 border-black bg-white px-3 py-2 -rotate-2 w-max shadow-[4px_4px_0px_0px_#000] hover:rotate-0 transition-transform duration-200">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B]" />
            <div className="w-2.5 h-2.5 bg-black" />
            <div
              className="w-2.5 h-2.5 bg-[#C4B5FD]"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
            />
          </div>
          <span className="text-sm font-black uppercase tracking-tighter text-black">BotBuilder</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {/* Bots */}
        <Link
          href="/dashboard/bots"
          className={`${linkBase} ${botsActive ? linkActive : linkInactive}`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={botsActive ? 3 : 2} />
          Bots
          {bots.length > 0 && (
            <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 border ${
              botsActive
                ? 'border-black text-black'
                : 'border-white/20 text-white/30'
            }`}>
              {bots.length}
            </span>
          )}
        </Link>

        {/* Bot sub-list */}
        {bots.length > 0 && (
          <div className="ml-3 border-l-2 border-white/10 pl-2 space-y-px">
            {bots.map(bot => {
              const botActive = pathname.startsWith(`/dashboard/bots/${bot.id}`)
              return (
                <Link
                  key={bot.id}
                  href={`/dashboard/bots/${bot.id}/triggers`}
                  className={`flex items-center gap-2 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-100 border ${
                    botActive
                      ? 'border-[#FFD93D]/40 bg-[#FFD93D]/10 text-[#FFD93D]'
                      : 'border-transparent text-white/40 hover:text-white/70'
                  }`}
                >
                  <span
                    className="w-2 h-2 shrink-0"
                    style={{
                      backgroundColor: bot.is_active ? '#FFD93D' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                  <span className="truncate">{bot.name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Inbox */}
        <Link
          href="/dashboard/inbox"
          className={`${linkBase} ${inboxActive ? linkActive : linkInactive}`}
        >
          <Inbox className="w-4 h-4 shrink-0" strokeWidth={inboxActive ? 3 : 2} />
          Inbox
          {attentionCount > 0 && (
            <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 bg-[#FF6B6B] text-black border-2 border-black">
              {attentionCount > 99 ? '99+' : attentionCount}
            </span>
          )}
        </Link>

        {/* Notification Bell */}
        <NotificationBell botIds={bots.map(b => b.id)} />

        {/* Team — owners only */}
        {isOwner && (
          <Link
            href="/dashboard/team"
            className={`${linkBase} ${teamActive ? linkActive : linkInactive}`}
          >
            <Users className="w-4 h-4 shrink-0" strokeWidth={teamActive ? 3 : 2} />
            Team
          </Link>
        )}

        {/* Super Admin */}
        {isSuperAdmin && (
          <Link
            href="/dashboard/super-admin"
            className={`${linkBase} ${superAdminActive ? linkActive : linkInactive}`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={superAdminActive ? 3 : 2} />
            Super Admin
          </Link>
        )}

        {/* Analytics */}
        <Link
          href="/dashboard/analytics"
          className={`${linkBase} ${analyticsActive ? linkActive : linkInactive}`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" strokeWidth={analyticsActive ? 3 : 2} />
          Analytics
        </Link>

      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t-4 border-[#FFD93D]/30">
        <div className="mb-3 px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">
            Signed in as
          </p>
          <p className="text-sm font-black text-white truncate">{user.name}</p>
          <p className="text-xs font-bold text-white/30 truncate">{user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/30 hover:text-[#FF6B6B] transition-colors duration-100 px-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
