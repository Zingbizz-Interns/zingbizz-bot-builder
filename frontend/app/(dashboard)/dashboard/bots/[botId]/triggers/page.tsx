import { getTriggers } from '@/lib/actions/triggers'
import TriggerList from './_components/TriggerList'

export default async function TriggersPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params
  const triggers = await getTriggers(botId)

  return <TriggerList botId={botId} initialTriggers={triggers} />
}
