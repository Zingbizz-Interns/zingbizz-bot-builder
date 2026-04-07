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
  const botsActive      = pathname.startsWith('/dashboard/bots')
  const analyticsActive = pathname.startsWith('/dashboard/analytics')
  const teamActive      = pathname.startsWith('/dashboard/team')
  const inboxActive     = pathname.startsWith('/dashboard/inbox')
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

  return (
    <aside className="w-56 bg-[#121212] border-r-4 border-[#121212] flex flex-col h-full shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b-4 border-[#F0C020]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D02020]" />
          <div className="w-2.5 h-2.5 bg-[#F0C020]" />
          <div
            className="w-2.5 h-2.5"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', backgroundColor: '#1040C0' }}
          />
        </div>
        <span className="text-base font-black uppercase tracking-tighter text-white">BotBuilder</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {/* Bots */}
        <Link
          href="/dashboard/bots"
          className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 ${
            botsActive
              ? 'bg-[#F0F0F0] text-[#121212] border-[#F0C020] shadow-[3px_3px_0px_0px_#F0C020]'
              : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={botsActive ? 3 : 2} />
          Bots
          {bots.length > 0 && (
            <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 border ${
              botsActive ? 'border-[#121212]/30 text-[#121212]/50' : 'border-white/20 text-white/30'
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
                  className={`flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-150 border ${
                    botActive
                      ? 'border-[#F0C020]/40 bg-[#F0C020]/10 text-[#F0C020]'
                      : 'border-transparent text-white/40 hover:text-white/70'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: bot.is_active ? '#F0C020' : '#ffffff30' }}
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
          className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 ${
            inboxActive
              ? 'bg-[#F0F0F0] text-[#121212] border-[#F0C020] shadow-[3px_3px_0px_0px_#F0C020]'
              : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
          }`}
        >
          <Inbox className="w-4 h-4 shrink-0" strokeWidth={inboxActive ? 3 : 2} />
          Inbox
          {attentionCount > 0 && (
            <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#D02020] text-white">
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
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 ${
              teamActive
                ? 'bg-[#F0F0F0] text-[#121212] border-[#F0C020] shadow-[3px_3px_0px_0px_#F0C020]'
                : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" strokeWidth={teamActive ? 3 : 2} />
            Team
          </Link>
        )}

        {isSuperAdmin && (
          <Link
            href="/dashboard/super-admin"
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 ${
              superAdminActive
                ? 'bg-[#F0F0F0] text-[#121212] border-[#F0C020] shadow-[3px_3px_0px_0px_#F0C020]'
                : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={superAdminActive ? 3 : 2} />
            Super Admin
          </Link>
        )}

        {/* Analytics */}
        <Link
          href="/dashboard/analytics"
          className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-2 ${
            analyticsActive
              ? 'bg-[#F0F0F0] text-[#121212] border-[#F0C020] shadow-[3px_3px_0px_0px_#F0C020]'
              : 'text-white/60 border-transparent hover:text-white hover:border-white/20'
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" strokeWidth={analyticsActive ? 3 : 2} />
          Analytics
        </Link>

      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t-2 border-white/10">
        <div className="mb-3 px-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-0.5">Signed in as</p>
          <p className="text-sm font-bold text-white truncate">{user.name}</p>
          <p className="text-xs font-medium text-white/40 truncate">{user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#D02020] transition-colors duration-200 px-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
