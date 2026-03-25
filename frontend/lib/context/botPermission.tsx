'use client'

import { createContext, useContext } from 'react'

const BotPermissionContext = createContext<boolean>(true)

export function BotPermissionProvider({
  canEdit,
  children,
}: {
  canEdit: boolean
  children: React.ReactNode
}) {
  return (
    <BotPermissionContext.Provider value={canEdit}>
      {children}
    </BotPermissionContext.Provider>
  )
}

/** Returns true if the current user can edit this bot (owner or sub-account with can_edit). */
export function useCanEdit() {
  return useContext(BotPermissionContext)
}
