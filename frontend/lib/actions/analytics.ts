'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Answer Distribution ──────────────────────────────────────

export interface AnswerOption {
  label: string
  count: number
  pct: number
}

export interface QuestionDistribution {
  questionId: string
  questionText: string
  orderIndex: number
  formName: string
  totalAnswers: number
  options: AnswerOption[]
}

export async function getAnswerDistribution(botId: string): Promise<QuestionDistribution[]> {
  const supabase = await createClient()

  const { data: triggers } = await supabase
    .from('triggers')
    .select('id, name')
    .eq('bot_id', botId)
    .eq('action_type', 'form')

  if (!triggers?.length) return []

  const triggerIds = triggers.map(t => t.id)
  const triggerNameMap = Object.fromEntries(triggers.map(t => [t.id, t.name]))

  const { data: forms } = await supabase
    .from('forms')
    .select('id, trigger_id')
    .in('trigger_id', triggerIds)

  if (!forms?.length) return []

  const formIds = forms.map(f => f.id)
  const formTriggerMap = Object.fromEntries(forms.map(f => [f.id, f.trigger_id]))

  const { data: questions } = await supabase
    .from('form_questions')
    .select('id, question_text, order_index, form_id')
    .in('form_id', formIds)
    .eq('input_type', 'choice')

  if (!questions?.length) return []

  const questionIds = questions.map(q => q.id)

  const { data: answers } = await supabase
    .from('form_response_answers')
    .select('question_id, answer_text')
    .in('question_id', questionIds)

  if (!answers?.length) return []

  const answersByQuestion: Record<string, Record<string, number>> = {}
  for (const a of answers) {
    if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = {}
    const map = answersByQuestion[a.question_id]
    map[a.answer_text] = (map[a.answer_text] || 0) + 1
  }

  return questions
    .filter(q => answersByQuestion[q.id])
    .map(q => {
      const counts = answersByQuestion[q.id]
      const total = Object.values(counts).reduce((s, v) => s + v, 0)
      const options = Object.entries(counts)
        .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
      const triggerId = formTriggerMap[q.form_id]
      return {
        questionId: q.id,
        questionText: q.question_text,
        orderIndex: q.order_index,
        formName: triggerNameMap[triggerId] || 'Unknown Form',
        totalAnswers: total,
        options,
      }
    })
    .sort((a, b) => a.formName.localeCompare(b.formName) || a.orderIndex - b.orderIndex)
}

export type DateRange = '7d' | '30d' | 'all'
export type PlatformFilter = 'all' | 'whatsapp' | 'instagram'

export interface TriggerStat {
  id: string
  name: string
  count: number
}

export interface FormStat {
  id: string
  name: string
  started: number
  completed: number
  abandoned: number
  completionRate: number
}

export interface QuestionStat {
  id: string
  text: string
  order: number
  answered: number
  abandoned: number
  abandonRate: number
}

export interface AnalyticsData {
  triggerStats: TriggerStat[]
  formStats: FormStat[]
  questionStats: QuestionStat[]
  activeUsers: number
  totals: {
    triggerFires: number
    formsCompleted: number
    abandonRate: number
  }
}

function getStartDate(range: DateRange): string | null {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : 30
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export async function getAnalytics(
  botId: string,
  range: DateRange,
  platform: PlatformFilter
): Promise<AnalyticsData> {
  const supabase = await createClient()
  const since = getStartDate(range)

  let q = supabase
    .from('analytics_events')
    .select('event_type, trigger_id, question_id, platform, sender_id, created_at')
    .eq('bot_id', botId)

  if (since) q = q.gte('created_at', since)
  if (platform !== 'all') q = q.eq('platform', platform)

  const { data: events, error } = await q
  if (error) throw new Error(error.message)

  const empty: AnalyticsData = {
    triggerStats: [],
    formStats: [],
    questionStats: [],
    activeUsers: 0,
    totals: { triggerFires: 0, formsCompleted: 0, abandonRate: 0 },
  }

  if (!events || events.length === 0) return empty

  // Fetch trigger names
  const triggerIds = [...new Set(events.map(e => e.trigger_id).filter(Boolean))] as string[]
  const triggerNameMap: Record<string, string> = {}
  if (triggerIds.length) {
    const { data: triggers } = await supabase
      .from('triggers')
      .select('id, name')
      .in('id', triggerIds)
    if (triggers) for (const t of triggers) triggerNameMap[t.id] = t.name
  }

  // Fetch question texts
  const questionIds = [...new Set(events.map(e => e.question_id).filter(Boolean))] as string[]
  const questionTextMap: Record<string, string> = {}
  const questionOrderMap: Record<string, number> = {}
  if (questionIds.length) {
    const { data: questions } = await supabase
      .from('form_questions')
      .select('id, question_text, order_index')
      .in('id', questionIds)
    if (questions) {
      for (const q of questions) {
        questionTextMap[q.id] = q.question_text
        questionOrderMap[q.id] = q.order_index
      }
    }
  }

  // Aggregate counters
  const triggerFired: Record<string, number> = {}
  const formStarted: Record<string, number> = {}
  const formCompleted: Record<string, number> = {}
  const formAbandoned: Record<string, number> = {}
  const questionAnswered: Record<string, number> = {}
  const questionAbandoned: Record<string, number> = {}
  const nowMinus1h = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const activeSet = new Set<string>()

  for (const e of events) {
    if (e.created_at >= nowMinus1h && e.sender_id) activeSet.add(e.sender_id)

    const tid = e.trigger_id as string | null
    const qid = e.question_id as string | null

    switch (e.event_type) {
      case 'trigger_fired':
        if (tid) triggerFired[tid] = (triggerFired[tid] || 0) + 1
        break
      case 'form_started':
        if (tid) formStarted[tid] = (formStarted[tid] || 0) + 1
        break
      case 'form_completed':
        if (tid) formCompleted[tid] = (formCompleted[tid] || 0) + 1
        break
      case 'form_abandoned':
        if (tid) formAbandoned[tid] = (formAbandoned[tid] || 0) + 1
        break
      case 'question_answered':
        if (qid) questionAnswered[qid] = (questionAnswered[qid] || 0) + 1
        break
      case 'question_abandoned':
        if (qid) questionAbandoned[qid] = (questionAbandoned[qid] || 0) + 1
        break
    }
  }

  // Trigger leaderboard
  const triggerStats: TriggerStat[] = Object.entries(triggerFired)
    .map(([id, count]) => ({ id, name: triggerNameMap[id] || id.slice(0, 8), count }))
    .sort((a, b) => b.count - a.count)

  // Form stats
  const formTriggerIds = [...new Set([
    ...Object.keys(formStarted),
    ...Object.keys(formCompleted),
    ...Object.keys(formAbandoned),
  ])]
  const formStats: FormStat[] = formTriggerIds.map(id => {
    const started = formStarted[id] || 0
    const completed = formCompleted[id] || 0
    const abandoned = formAbandoned[id] || 0
    return {
      id,
      name: triggerNameMap[id] || id.slice(0, 8),
      started,
      completed,
      abandoned,
      completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
    }
  }).sort((a, b) => b.started - a.started)

  // Question stats
  const allQIds = [...new Set([...Object.keys(questionAnswered), ...Object.keys(questionAbandoned)])]
  const questionStats: QuestionStat[] = allQIds.map(id => {
    const answered = questionAnswered[id] || 0
    const abandoned = questionAbandoned[id] || 0
    return {
      id,
      text: questionTextMap[id] || 'Unknown question',
      order: questionOrderMap[id] || 0,
      answered,
      abandoned,
      abandonRate: (answered + abandoned) > 0
        ? Math.round((abandoned / (answered + abandoned)) * 100)
        : 0,
    }
  }).sort((a, b) => a.order - b.order)

  // Totals
  const totalFires = Object.values(triggerFired).reduce((s, v) => s + v, 0)
  const totalCompleted = Object.values(formCompleted).reduce((s, v) => s + v, 0)
  const totalStarted = Object.values(formStarted).reduce((s, v) => s + v, 0)
  const overallAbandonRate = totalStarted > 0
    ? Math.round(((totalStarted - totalCompleted) / totalStarted) * 100)
    : 0

  return {
    triggerStats,
    formStats,
    questionStats,
    activeUsers: activeSet.size,
    totals: { triggerFires: totalFires, formsCompleted: totalCompleted, abandonRate: overallAbandonRate },
  }
}
