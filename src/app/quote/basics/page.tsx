'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ProgressSteps from '@/components/quote/ProgressSteps'
import { searchClassCodes } from '@/lib/questions'
import type { ClassCodeMapping } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export default function BasicsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    insured_name: '',
    ein: '',
    state: 'CO',
    annual_payroll: '',
    employee_count: '',
    ncci_code: '',
    industry_label: '',
  })
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<ClassCodeMapping[]>([])
  const [showDrop, setShowDrop]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setResults(searchClassCodes(query))
    setShowDrop(true)
  }, [query])

  function selectCode(mapping: ClassCodeMapping) {
    setForm((f) => ({ ...f, ncci_code: mapping.ncci_code, industry_label: mapping.industry_label }))
    setQuery(mapping.industry_label)
    setShowDrop(false)
  }

  const valid =
    form.insured_name.trim() &&
    form.state &&
    form.ncci_code &&
    form.annual_payroll &&
    form.employee_count

  async function handleSubmit() {
    if (!valid) return
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('applications')
      .insert({
        insured_name:   form.insured_name.trim(),
        ein:            form.ein.trim() || null,
        state:          form.state,
        ncci_code:      form.ncci_code,
        industry_label: form.industry_label,
        annual_payroll: parseFloat(form.annual_payroll.replace(/,/g, '')),
        employee_count: parseInt(form.employee_count),
        status:         'draft',
      })
      .select('id')
      .single()

    if (err || !data) {
      setError(err?.message ?? 'Failed to save. Check Supabase connection.')
      setSaving(false)
      return
    }
    router.push(`/quote/carriers?id=${data.id}`)
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-b from-brand-50 to-white border-b border-gray-100">
            <p className="text-xs font-extrabold tracking-wide text-gray-900 mb-2 px-6 pt-5">
              Quote <span className="text-orange-500">C</span>onnector
            </p>
            <h1 className="text-xl font-bold text-brand-600 px-6">Business Information</h1>
            <p className="text-xs text-gray-500 mt-0.5 px-6">Worker's Compensation</p>
            <ProgressSteps current={0} />
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Business Name *</label>
                <input
                  className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  placeholder="Mesa Verde Restaurant LLC"
                  value={form.insured_name}
                  onChange={(e) => setForm((f) => ({ ...f, insured_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">EIN</label>
                <input
                  className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  placeholder="84-1234567"
                  value={form.ein}
                  onChange={(e) => setForm((f) => ({ ...f, ein: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">State *</label>
                <select
                  className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-brand-600 bg-white"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                >
                  <option value="CO">Colorado (CO)</option>
                  <option value="TX">Texas (TX)</option>
                  <option value="CA">California (CA)</option>
                  <option value="NY">New York (NY)</option>
                  <option value="FL">Florida (FL)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Annual Payroll (USD) *</label>
                <input
                  className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  placeholder="420,000"
                  value={form.annual_payroll}
                  onChange={(e) => setForm((f) => ({ ...f, annual_payroll: e.target.value }))}
                />
              </div>
            </div>

            {/* Class code search */}
            <div className="relative">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Industry / Class Code *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
                <input
                  className="w-full h-9 border border-gray-300 rounded-lg pl-8 pr-3 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  placeholder="Type to search — e.g. restaurant, farm, college…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setForm((f) => ({ ...f, ncci_code:'', industry_label:'' })) }}
                  onFocus={() => query.length >= 2 && setShowDrop(true)}
                />
              </div>
              {showDrop && results.length > 0 && (
                <div className="absolute z-10 w-full border border-brand-600 border-t-0 rounded-b-lg overflow-hidden shadow-lg bg-white">
                  {results.map((m) => (
                    <button
                      key={m.ncci_code}
                      onClick={() => selectCode(m)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-gray-100 last:border-0 hover:bg-brand-50 transition-colors ${
                        form.ncci_code === m.ncci_code ? 'bg-brand-50' : ''
                      }`}
                    >
                      <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0">
                        {m.ncci_code}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{m.industry_label}</p>
                        <p className="text-[10px] text-gray-500">NAICS {m.naics_code} · SIC {m.sic_code}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDrop && results.length === 0 && query.length >= 2 && (
                <div className="absolute z-10 w-full border border-gray-200 rounded-b-lg bg-white px-3 py-3 text-xs text-gray-500">
                  No matching class codes. Try different keywords.
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Number of Employees *</label>
              <input
                className="w-40 h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                placeholder="24"
                type="number"
                min="1"
                value={form.employee_count}
                onChange={(e) => setForm((f) => ({ ...f, employee_count: e.target.value }))}
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => router.push('/quote')}
              className="h-9 px-4 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!valid || saving}
              className="h-9 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Continue to Carriers →'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
