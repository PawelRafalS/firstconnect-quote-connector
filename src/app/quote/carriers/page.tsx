'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '@/components/layout/AppShell'
import ProgressSteps from '@/components/quote/ProgressSteps'
import { CARRIERS, countQuestionsForCarriers, additionalQuestionsForCarrier } from '@/lib/questions'
import { createClient } from '@/lib/supabase/client'
import type { Application } from '@/lib/types'

function CarriersInner() {
  const router       = useRouter()
  const params       = useSearchParams()
  const id           = params.get('id') ?? ''
  const supabase     = createClient()

  const [app, setApp]         = useState<Application | null>(null)
  const [selected, setSelected] = useState<string[]>(['pieco', 'amtrust'])
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!id) return
    supabase.from('applications').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setApp(data as Application) })
  }, [id])

  function toggle(cid: string) {
    setSelected((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid],
    )
  }

  const ncci = app?.ncci_code ?? '9083'
  const counts = countQuestionsForCarriers(ncci, selected)

  async function handleContinue() {
    if (!selected.length || !id) return
    setSaving(true)
    await supabase
      .from('applications')
      .update({ selected_carrier_ids: selected })
      .eq('id', id)
    router.push(`/quote/application?id=${id}`)
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-b from-brand-50 to-white border-b border-gray-100">
            <p className="text-xs font-extrabold tracking-wide text-gray-900 mb-2 px-6 pt-5">
              Quote <span className="text-orange-500">C</span>onnector
            </p>
            <h1 className="text-xl font-bold text-brand-600 px-6">Select Carriers</h1>
            <p className="text-xs text-gray-500 mt-0.5 px-6">
              {app ? `${app.industry_label} · ${app.state} · ${app.employee_count} employees · $${Number(app.annual_payroll).toLocaleString()} payroll` : 'Loading…'}
            </p>
            <ProgressSteps current={1} />
          </div>

          <div className="px-6 py-5">
            {/* Summary hint */}
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-2.5 text-xs text-brand-700 mb-4">
              <strong>{selected.length} carrier{selected.length !== 1 ? 's' : ''} selected</strong>
              {' '}— {counts.total} questions total ({counts.shared} shared + {counts.carrier_specific} carrier-specific).
              {' '}Deselecting a carrier removes their exclusive questions.
            </div>

            {/* Carrier cards */}
            <div className="space-y-3 mb-5">
              {CARRIERS.map((carrier) => {
                const isSelected = selected.includes(carrier.id)
                const extra = additionalQuestionsForCarrier(
                  ncci, carrier.id, selected.filter((x) => x !== carrier.id),
                )
                return (
                  <button
                    key={carrier.id}
                    onClick={() => toggle(carrier.id)}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-xl border-[1.5px] text-left transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-blue-50/40'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5.5 h-5.5 rounded-full border-[1.5px] flex items-center justify-center text-[11px] shrink-0 transition-colors ${
                      isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                    {/* Logo */}
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${carrier.logo_color}`}>
                      {carrier.logo_initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{carrier.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                        {extra > 0 ? `+${extra} additional questions` : 'No additional questions'}
                        <span>·</span>
                        <span>{carrier.class_code_std} codes</span>
                        <span>·</span>
                        <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Eligible</span>
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* Ineligible placeholder */}
              <div className="w-full flex items-center gap-4 p-3.5 rounded-xl border-[1.5px] border-gray-200 bg-white opacity-45">
                <div className="w-5.5 h-5.5 rounded-full border-[1.5px] border-gray-300 shrink-0" />
                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">TRV</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Travelers</p>
                  <p className="text-[11px] text-gray-400">Not available — NCCI {ncci} not supported in {app?.state ?? 'CO'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => router.push(`/quote/basics`)}
              className="h-9 px-4 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleContinue}
              disabled={!selected.length || saving}
              className="h-9 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : `Start Application (${counts.total} questions) →`}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function CarriersPage() {
  return <Suspense><CarriersInner /></Suspense>
}
