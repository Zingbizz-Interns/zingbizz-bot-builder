'use client'

import { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import PhoneMockup from '@/components/ui/PhoneMockup'

interface QuestionPreview {
  localId: string
  question_text: string
  input_type: 'text' | 'choice'
  is_required: boolean
  options: { label: string }[]
  conditions: {
    conditionQuestionLocalId: string
    operator: 'eq' | 'neq' | 'contains'
    value: string
  }[]
}

interface FormPreviewProps {
  platforms: string[]
  botName: string
  title: string
  questions: QuestionPreview[]
}

interface HistoryEntry {
  questionText: string
  answer: string
}

export default function FormPreview({ platforms, botName, questions }: FormPreviewProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQIdx, setCurrentQIdx] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLenRef = useRef(-1)

  function resolveTokens(text: string, hist: HistoryEntry[]) {
    return text.replace(/\{Q(\d+)\}/g, (_, n) => {
      const idx = parseInt(n) - 1
      return hist[idx]?.answer ?? `{Q${n}}`
    })
  }

  function isQuestionVisible(q: QuestionPreview, ans: Record<string, string>): boolean {
    if (!q.conditions.length) return true
    return q.conditions.every(c => {
      const val = (ans[c.conditionQuestionLocalId] ?? '').toLowerCase()
      const cval = c.value.toLowerCase()
      if (c.operator === 'eq') return val === cval
      if (c.operator === 'neq') return val !== cval
      if (c.operator === 'contains') return val.includes(cval)
      return true
    })
  }

  function findNextIdx(fromIdx: number, ans: Record<string, string>): number | null {
    for (let i = fromIdx; i < questions.length; i++) {
      if (isQuestionVisible(questions[i], ans)) return i
    }
    return null
  }

  function reset() {
    setHistory([])
    setAnswers({})
    setIsComplete(false)
    setInputValue('')
    setCurrentQIdx(findNextIdx(0, {}))
  }

  // Re-initialize when questions list length changes
  useEffect(() => {
    if (prevLenRef.current !== questions.length) {
      prevLenRef.current = questions.length
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length])

  function submitAnswer(answer: string) {
    if (currentQIdx === null) return
    const q = questions[currentQIdx]
    const trimmed = answer.trim()
    if (!trimmed && q.is_required) return

    const resolvedText = resolveTokens(q.question_text, history)
    const finalAnswer = trimmed || 'skip'
    const newHistory: HistoryEntry[] = [...history, { questionText: resolvedText, answer: finalAnswer }]
    const newAnswers = { ...answers, [q.localId]: finalAnswer }

    setHistory(newHistory)
    setAnswers(newAnswers)
    setInputValue('')

    const next = findNextIdx(currentQIdx + 1, newAnswers)
    if (next === null) {
      setIsComplete(true)
      setCurrentQIdx(null)
    } else {
      setCurrentQIdx(next)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, currentQIdx, isComplete])

  const total = questions.length
  const currentQ = currentQIdx !== null ? questions[currentQIdx] : null
  const answeredCount = history.length

  const isTextInput = currentQ?.input_type === 'text'

  return (
    <div className="flex flex-col items-center gap-3">
      <PhoneMockup
        platforms={platforms}
        botName={botName}
        label="Interactive Preview"
        inputValue={isTextInput ? inputValue : undefined}
        onInputChange={isTextInput ? setInputValue : undefined}
        onInputSubmit={isTextInput ? () => submitAnswer(inputValue) : undefined}
        inputPlaceholder={isTextInput ? (currentQ?.is_required ? 'Type answer...' : 'Type or skip...') : undefined}
      >
        {(isWA) => total === 0 ? (
          <p className="text-center text-xs text-gray-400 italic py-8">Add questions to preview</p>
        ) : (
          <div className="w-full flex flex-col gap-2">
            {/* Progress bar */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${isWA ? 'bg-[#128C7E]' : 'bg-[#0095F6]'}`}
                  style={{ width: `${isComplete ? 100 : total > 0 ? (answeredCount / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] font-bold text-gray-500 shrink-0">
                {isComplete ? `${total}/${total}` : `${answeredCount}/${total}`}
              </span>
            </div>

            {/* Scrollable chat history */}
            <div ref={scrollRef} className="max-h-[200px] overflow-y-auto flex flex-col gap-1.5">
              {history.map((h, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="max-w-[85%] self-start">
                    <div className={`px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs leading-relaxed ${isWA ? 'bg-white text-[#121212] shadow-sm' : 'bg-[#F0F0F0] text-[#121212]'}`}>
                      <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {h.questionText || 'Question text...'}
                      </p>
                    </div>
                  </div>
                  <div className="max-w-[70%] self-end">
                    <div className={`px-3 py-2 rounded-tl-xl rounded-tr-xl rounded-bl-xl text-xs ${isWA ? 'bg-[#DCF8C6] text-[#121212]' : 'bg-[#0095F6] text-white'}`}>
                      <p>{h.answer}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Current question bubble */}
              {currentQ && (
                <div className="max-w-[85%] self-start">
                  <div className={`px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs leading-relaxed ${isWA ? 'bg-white text-[#121212] shadow-sm' : 'bg-[#F0F0F0] text-[#121212]'}`}>
                    <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {resolveTokens(currentQ.question_text, history) || 'Question text...'}
                    </p>
                    {!currentQ.is_required && (
                      <p className="text-[10px] text-gray-400 mt-1 italic">Optional - reply &quot;skip&quot;</p>
                    )}
                  </div>
                </div>
              )}

              {/* Completion */}
              {isComplete && (
                <div className="max-w-[85%] self-start">
                  <div className={`px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs ${isWA ? 'bg-white text-[#121212] shadow-sm' : 'bg-[#F0F0F0] text-[#121212]'}`}>
                    <p className="font-bold" style={{ color: '#128C7E' }}>✓ Form complete</p>
                  </div>
                </div>
              )}
            </div>

            {/* Multiple choice buttons */}
            {currentQ?.input_type === 'choice' && currentQ.options.length > 0 && (
              <div className="flex flex-col gap-1 shrink-0">
                {currentQ.options.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => submitAnswer(o.label || `Option ${i + 1}`)}
                    className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border active:scale-95 transition-transform ${
                      isWA ? 'bg-white border-[#128C7E] text-[#128C7E]' : 'bg-white border-[#0095F6] text-[#0095F6]'
                    }`}
                  >
                    {o.label || `Option ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

          </div>
        )}
      </PhoneMockup>

      {/* Reset button */}
      {total > 0 && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#121212]/50 hover:text-[#121212] border-2 border-[#121212]/30 hover:border-[#121212] px-3 py-1.5 transition-colors"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={3} />
          Reset
        </button>
      )}
    </div>
  )
}
