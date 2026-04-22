'use client'

import { useState } from 'react'
import PhoneMockup from '@/components/ui/PhoneMockup'

interface QuestionPreview  { question_text: string; answer_text: string }
interface CategoryPreview  { category_name: string; questions: QuestionPreview[] }

interface QueryPreviewProps {
  platforms: string[]
  botName: string
  categories: CategoryPreview[]
}

type PreviewState =
  | { stage: 'categories' }
  | { stage: 'questions'; catIndex: number }
  | { stage: 'answer';    catIndex: number; qIndex: number }

export default function QueryPreview({ platforms, botName, categories }: QueryPreviewProps) {
  const [state, setState] = useState<PreviewState>({ stage: 'categories' })

  function reset() { setState({ stage: 'categories' }) }

  const currentCat = state.stage !== 'categories' ? categories[state.catIndex] : null
  const currentQ   = state.stage === 'answer' && currentCat ? currentCat.questions[state.qIndex] : null

  return (
    <PhoneMockup platforms={platforms} botName={botName} label="Live Preview · Click to interact">
      {(isWA) => {
        const bubbleCls = isWA ? 'bg-white text-[#000000] shadow-sm' : 'bg-[#FFFDF5] text-black'
        const btnCls    = isWA ? 'bg-white border-[#128C7E] text-[#128C7E]' : 'bg-white border-[#0095F6] text-[#0095F6]'

        return categories.length === 0 ? (
          <p className="text-center text-xs text-black/400 italic py-8">Add categories to preview</p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Bot message bubble */}
            <div className="max-w-[85%] self-start">
              <div className={`px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs leading-relaxed ${bubbleCls}`}>
                {state.stage === 'categories' && 'What would you like to know about?'}
                {state.stage === 'questions' && currentCat && `Here are questions about ${currentCat.category_name}:`}
                {state.stage === 'answer' && currentQ && currentQ.answer_text}
                <span className="block text-right text-[9px] mt-0.5 text-black/400">
                  {isWA ? '9:41 ✓✓' : '9:41 AM'}
                </span>
              </div>
            </div>

            {/* Category buttons */}
            {state.stage === 'categories' && (
              <div className="flex flex-col gap-1.5 mt-1">
                {categories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setState({ stage: 'questions', catIndex: i })}
                    className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border ${btnCls}`}
                  >
                    {cat.category_name || `Category ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {/* Question buttons */}
            {state.stage === 'questions' && currentCat && (
              <div className="flex flex-col gap-1.5 mt-1">
                {currentCat.questions.length === 0 ? (
                  <p className="text-xs text-black/400 italic text-center">No questions in this category</p>
                ) : currentCat.questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setState({ stage: 'answer', catIndex: state.catIndex, qIndex: i })}
                    className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border text-left ${btnCls}`}
                  >
                    {q.question_text || `Question ${i + 1}`}
                  </button>
                ))}
                <button
                  onClick={reset}
                  className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border ${btnCls} opacity-60`}
                >
                  ← Back
                </button>
              </div>
            )}

            {/* Answer actions */}
            {state.stage === 'answer' && (
              <div className="flex flex-col gap-1.5 mt-1">
                <button
                  onClick={() => setState({ stage: 'categories' })}
                  className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border ${btnCls}`}
                >
                  Ask another question
                </button>
                <button
                  onClick={reset}
                  className={`w-full py-1.5 px-3 text-xs font-bold rounded-full border ${btnCls} opacity-60`}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )
      }}
    </PhoneMockup>
  )
}
