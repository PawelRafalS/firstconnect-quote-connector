'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '@/components/layout/AppShell'
import ProgressSteps from '@/components/quote/ProgressSteps'
import {
  getTopLevelQuestions, getSubQuestions, getQuestionCarriers,
  FORM_SECTIONS, getSectionKey, CARRIERS,
} from '@/lib/questions'
import type { Question, Application, AnswerMap } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const CARRIER_BADGE: Record<string, string> = {
  pieco:   'bg-blue-100 text-blue-700',
  amtrust: 'bg-amber-100 text-amber-700',
}
const CARRIER_LABEL: Record<string, string> = {
  pieco:   'PIECO',
  amtrust: 'AmTrust',
}

function CarrierBadges({ carriers, all_selected }: { carriers: string[]; all_selected: string[] }) {
  if (carriers.length === all_selected.length && carriers.length > 1) {
    return <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">All carriers</span>
  }
  return (
    <div className="flex gap-1">
      {carriers.map((c) => (
        <span key={c} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${CARRIER_BADGE[c] ?? 'bg-gray-100 text-gray-600'}`}>
          {CARRIER_LABEL[c] ?? c}
        </span>
      ))}
    </div>
  )
}

function QuestionRow({
  question, answers, onAnswer, ncci_code, selected_carriers,
}: {
  question: Question
  answers: AnswerMap
  onAnswer: (key: string, val: string) => void
  ncci_code: string
  selected_carriers: string[]
}) {
  const value = answers[question.key] ?? ''
  const carriers = getQuestionCarriers(question, ncci_code, selected_carriers)

  // Sub-questions triggered by this question's answer
  const subs = value
    ? getSubQuestions(question.key, value, ncci_code, selected_carriers)
    : []

  return (
    <div className="pb-5 mb-5 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-gray-800 leading-snug flex-1">{question.question_content}</p>
        <CarrierBadges carriers={carriers} all_selected={selected_carriers} />
      </div>

      {/* Boolean */}
      {question.question_type === 'boolean' && (
        <div className="flex gap-2.5">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(question.key, opt)}
              className={`flex items-center gap-2 h-9 px-4 rounded-lg border-[1.5px] text-xs font-medium transition-colors ${
                value === opt
                  ? 'border-brand-600 bg-brand-50 text-brand-700 font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className={`w-3 h-3 rounded-full border-[1.5px] ${value === opt ? 'bg-brand-600 border-brand-600 shadow-[inset_0_0_0_1.5px_white]' : 'border-gray-300'}`} />
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Options */}
      {question.question_type === 'options' && question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(question.key, opt)}
              className={`h-9 px-4 rounded-lg border-[1.5px] text-xs font-medium transition-colors ${
                value === opt
                  ? 'border-brand-600 bg-brand-50 text-brand-700 font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Numeric */}
      {question.question_type === 'numeric' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            className="w-32 h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            value={value}
            onChange={(e) => onAnswer(question.key, e.target.value)}
            placeholder="0"
          />
          {question.question_unit && (
            <span className="text-xs text-gray-400">{question.question_unit}</span>
          )}
          {question.threshold_conflict && (
            <span className="text-[9px] text-gray-400 italic ml-1">Each carrier applies its own threshold</span>
          )}
        </div>
      )}

      {/* Text */}
      {question.question_type === 'text' && (
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 resize-none"
          rows={2}
          value={value}
          onChange={(e) => onAnswer(question.key, e.target.value)}
          placeholder="Enter details…"
        />
      )}

      {/* Sub-questions */}
      {subs.length > 0 && (
        <div className="mt-3 ml-4 pl-4 border-l-[3px] border-blue-200 space-y-4">
          <p className="text-[9px] font-bold text-blue-300 tracking-widest uppercase">↳ Follow-up</p>
          {subs.map((sub) => (
            <QuestionRow
              key={sub.key}
              question={sub}
              answers={answers}
              onAnswer={onAnswer}
              ncci_code={ncci_code}
              selected_carriers={selected_carriers}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ApplicationInner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const id       = params.get('id') ?? ''
  const supabase = createClient()

  const [app, setApp]           = useState<Application | null>(null)
  const [answers, setAnswers]   = useState<AnswerMap>({})
  const [section, setSection]   = useState(0)
  const [saveStatus, setSave]   = useState<'idle'|'saving'|'saved'>('idle')
  const [submitting, setSubm]   = useState(false)

  useEffect(() => {
    if (!id) return
    supabase.from('applications').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setApp(data as Application) })
    // Load any existing answers
    supabase.from('application_answers').select('question_key,raw_value').eq('application_id', id)
      .then(({ data }) => {
        if (data) {
          const map: AnswerMap = {}
          data.forEach((row) => { map[row.question_key] = row.raw_value })
          setAnswers(map)
        }
      })
  }, [id])

  const saveAnswer = useCallback(async (key: string, val: string) => {
    if (!id) return
    setSave('saving')
    await supabase.from('application_answers').upsert(
      { application_id: id, question_key: key, raw_value: val },
      { onConflict: 'application_id,question_key' },
    )
    setSave('saved')
    setTimeout(() => setSave('idle'), 2000)
  }, [id])

  function handleAnswer(key: string, val: string) {
    setAnswers((prev) => ({ ...prev, [key]: val }))
    saveAnswer(key, val)
  }

  async function handleSubmit() {
    if (!id) return
    setSubm(true)
    await supabase.from('applications').update({ status: 'submitted' }).eq('id', id)
    // Trigger carrier simulations via API route
    await fetch('/api/quotes/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: id }),
    })
    router.push(`/quote/results?id=${id}`)
  }

  if (!app) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          Loading application…
        </div>
      </AppShell>
    )
  }

  const selected = app.selected_carrier_ids ?? ['pieco', 'amtrust']
  const ncci     = app.ncci_code
  const allQs    = getTopLevelQuestions(ncci, selected)

  // Group by section
  const sectionedQs = FORM_SECTIONS.map((sec) => ({
    ...sec,
    questions: allQs.filter((q) => getSectionKey(q) === sec.key),
  }))

  const currentSec  = sectionedQs[section]
  const isLastSec   = section === FORM_SECTIONS.length - 1

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-b from-brand-50 to-white border-b border-gray-100">
            <h1 className="text-xl font-bold text-brand-600 px-6 pt-5">Worker's Comp Application</h1>
            <p className="text-xs text-gray-500 mt-0.5 px-6">
              {app.insured_name} · {app.state} · {selected.map((c) => CARRIERS.find((x) => x.id === c)?.name.split(' ')[0]).join(' + ')}
            </p>
            <ProgressSteps current={2} />
          </div>

          <div className="flex min-h-[480px]">
            {/* Section sidebar */}
            <div className="w-44 min-w-[176px] border-r border-gray-100 bg-gray-50/60 py-5">
              {sectionedQs.map((sec, i) => (
                <button
                  key={sec.key}
                  onClick={() => setSection(i)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-left transition-colors ${
                    i === section
                      ? 'text-brand-600 bg-brand-50 border-r-2 border-brand-600'
                      : i < section
                        ? 'text-gray-500'
                        : 'text-gray-300'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    i < section ? 'bg-gray-400' : i === section ? 'bg-brand-600' : 'bg-gray-200'
                  }`} />
                  {sec.label}
                  {sec.questions.length > 0 && (
                    <span className="ml-auto text-[9px] text-gray-400">{sec.questions.length}q</span>
                  )}
                </button>
              ))}
            </div>

            {/* Questions */}
            <div className="flex-1 px-6 py-5">
              {/* Auto-save indicator */}
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-4">
                <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Draft auto-saved'}
              </div>

              {currentSec.questions.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-10">
                  No questions in this section for the selected carriers.
                </div>
              ) : (
                currentSec.questions.map((q) => (
                  <QuestionRow
                    key={q.key}
                    question={q}
                    answers={answers}
                    onAnswer={handleAnswer}
                    ncci_code={ncci}
                    selected_carriers={selected}
                  />
                ))
              )}

              <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSection((s) => Math.max(0, s - 1))}
                  disabled={section === 0}
                  className="h-8 px-4 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 disabled:opacity-30"
                >
                  ← {section > 0 ? sectionedQs[section - 1].label : 'Back'}
                </button>
                {isLastSec ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="h-8 px-5 bg-brand-600 hover:bg-brand-700 disabled:bg-blue-200 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {submitting ? 'Submitting…' : `Submit to ${selected.length} carriers →`}
                  </button>
                ) : (
                  <button
                    onClick={() => setSection((s) => s + 1)}
                    className="h-8 px-5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {sectionedQs[section + 1].label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function ApplicationPage() {
  return <Suspense><ApplicationInner /></Suspense>
}
