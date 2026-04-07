'use client'

import { useState } from 'react'
import ConversationList from './ConversationList'
import ConversationThread from './ConversationThread'
import { type Conversation } from '@/lib/actions/inbox'

interface Props {
  botIds: string[]
  botId?: string // optional — scopes list to a single bot
  initialConversation?: Conversation
  initialSender?: string
}

export default function InboxClient({ botIds, botId, initialConversation, initialSender }: Props) {
  const [selected, setSelected] = useState<Conversation | undefined>(initialConversation)

  function handleSelect(conv: Conversation) {
    setSelected(conv)
  }

  function handleConversationUpdate(conv: Conversation) {
    setSelected(prev => prev?.id === conv.id ? { ...prev, ...conv } : prev)
  }

  return (
    <div className="flex h-full bg-[#F5F5F0]">
      {/* Left panel — conversation list */}
      <div className={selected ? 'hidden md:flex md:w-80 md:shrink-0 md:border-r-2 md:border-[#121212]/10 md:flex-col md:bg-white' : 'w-full md:w-80 md:shrink-0 md:border-r-2 md:border-[#121212]/10 flex flex-col bg-white'}>
        <ConversationList
          botIds={botIds}
          botId={botId}
          selectedId={selected?.id}
          initialSender={initialSender}
          onSelect={handleSelect}
        />
      </div>

      {/* Right panel — conversation thread */}
      <div className={selected ? 'flex-1 flex flex-col min-w-0' : 'hidden md:flex md:flex-1 md:flex-col md:min-w-0'}>
        <ConversationThread
          conversation={selected}
          emptySender={initialSender}
          onBack={() => setSelected(undefined)}
          onConversationUpdate={handleConversationUpdate}
        />
      </div>
    </div>
  )
}
