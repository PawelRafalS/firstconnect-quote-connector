'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '@/components/layout/AppShell'
import ProgressSteps from '@/components/quote/ProgressSteps'
import { CARRIERS, getCarrier } from '@/lib/questions'
import { createClient } from '@/lib/supabase/client'
import type { Application, Quote } from '@/lib/types'

const STATUS_CHIP: Record<string, string> = {
  quotable: 'bg-green-100 text-green-700',
  refer:    'bg-amber-100 text-amber-700',
  decline:  'bg-red-100 text-red-700',
  pending:  'bg-gray-100 text-gray-500',
  error:    'bg-red-50 text-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  quotable: '● Quoted',
  refer:    '◑ Refer',
  decline:  '○ Declined',
  pending:  '◌ Loading…',
  error:    '⚠ Error',
}

function ResultsInner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const id       = params.get('id') ?? ''
  const supabase = createClient()

  const [app, setApp]             = useState<Application | null>(null)
  const [quotes, setQuotes]       = useState<Quote[]>([])
  const [openTooltip, setTooltip] = useState<string | null>(null)
  const tooltipRef                = useRef<HTMLDivElement>(null)

  // Close tooltip on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltip(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load application
  useEffect(() => {
    if (!id) return
    supabase.from('applications').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setApp(data as Application) })
  }, [id])

  // Seed pending quote rows and subscribe to Realtime updates
  useEffect(() => {
    if (!app) return

    const carriers = app.selected_carrier_ids ?? ['pieco', 'amtrust']

    // Insert pending rows so the UI can show loading state immediately
    const seed = carriers.map((cid) => ({
      application_id: id, carrier_id: cid, status: 'pending',
    }))
    supabase.from('quotes').upsert(seed, { onConflict: 'application_id,carrier_id', ignoreDuplicates: true })
      .then(() => {
        // Load current state
        supabase.from('quotes').select('*').eq('application_id', id)
          .then(({ data }) => { if (data) setQuotes(data as Quote[]) })
      })

    // Subscribe to live updates
    const channel = supabase
      .channel(`quotes:${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'quotes',
        filter: `application_id=eq.${id}`,
      }, (payload) => {
        setQuotes((prev) => {
          const updated = payload.new as Quote
          const exists = prev.find((q) => q.carrier_id === updated.carrier_id)
          return exists
            ? prev.map((q) => q.carrier_id === updated.carrier_id ? updated : q)
            : [...prev, updated]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [app, id])

  const allResponded = quotes.length > 0 && quotes.every((q) => q.status !== 'pending')
  const respondedCount = quotes.filter((q) => q.status !== 'pending').length
  const totalCount = app?.selected_carrier_ids?.length ?? 0

  // Sort: quotable first by premium, then refer, then decline, pending last
  const sorted = [...quotes].sort((a, b) => {
    const order = { quotable: 0, refer: 1, decline: 2, error: 3, timeout: 4, pending: 5 }
    const oa = order[a.status] ?? 5
    const ob = order[b.status] ?? 5
    if (oa !== ob) return oa - ob
    if (a.status === 'quotable' && b.status === 'quotable') {
      return (a.premium_annual ?? 0) - (b.premium_annual ?? 0)
    }
    return 0
  })

  const bestPremium = sorted.find((q) => q.status === 'quotable')?.premium_annual

  // ── Exports ──────────────────────────────────────────────────

  function downloadCSV() {
    const headers = ['Carrier', 'Class Code Std', 'Status', 'Annual Premium (USD)', 'Notes']
    const rows = (app?.selected_carrier_ids ?? []).map((cid) => {
      const carrier = getCarrier(cid)
      const quote   = sorted.find((q) => q.carrier_id === cid)
      return [
        carrier?.name ?? cid,
        carrier?.class_code_std ?? '',
        quote?.status ?? 'pending',
        quote?.status === 'quotable' && quote.premium_annual
          ? String(quote.premium_annual)
          : '',
        quote?.refer_reasons?.join('; ') ?? '',
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `quote-comparison-${(app?.insured_name ?? 'unknown').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPDF() {
    // Build a standalone print-ready HTML document and open it in a new tab.
    // User clicks Print → Save as PDF in the browser dialog.
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const rows = (app?.selected_carrier_ids ?? []).map((cid) => {
      const carrier = getCarrier(cid)
      const quote   = sorted.find((q) => q.carrier_id === cid)
      const statusLabel: Record<string, string> = {
        quotable: 'Quoted', refer: 'Refer to Underwriter', decline: 'Declined', pending: 'Pending',
      }
      const premiumCell = quote?.status === 'quotable' && quote.premium_annual
        ? `<strong>$${Number(quote.premium_annual).toLocaleString()}</strong><br/><small>per year</small>`
        : quote?.status === 'refer'   ? '<span style="color:#92400e">Under review</span>'
        : quote?.status === 'decline' ? '<span style="color:#991b1b">Not eligible</span>'
        : '—'
      const isBest = quote?.status === 'quotable' && quote.premium_annual === bestPremium
      return `
        <tr>
          <td>${carrier?.name ?? cid}<br/><small style="color:#6b7280">${carrier?.class_code_std ?? ''}</small></td>
          <td><span class="chip chip-${quote?.status ?? 'pending'}">${statusLabel[quote?.status ?? 'pending'] ?? '—'}</span></td>
          <td>${premiumCell}${isBest ? ' <span class="best">★ Best price</span>' : ''}</td>
          <td>${quote?.refer_reasons?.join('<br/>') ?? '—'}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Quote Comparison — ${app?.insured_name ?? ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; padding: 40px; }
    .logo { font-size: 15px; font-weight: 800; letter-spacing: .04em; margin-bottom: 4px; }
    .logo span { color: #f97316; }
    h1 { font-size: 22px; font-weight: 700; color: #2563eb; margin: 12px 0 4px; }
    .meta { font-size: 11px; color: #6b7280; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase;
         letter-spacing: .06em; padding: 0 12px 10px; border-bottom: 1.5px solid #e5e7eb; }
    td { padding: 14px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    small { font-size: 10px; color: #6b7280; }
    .chip { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .chip-quotable { background: #d1fae5; color: #065f46; }
    .chip-refer    { background: #fef3c7; color: #92400e; }
    .chip-decline  { background: #fee2e2; color: #991b1b; }
    .chip-pending  { background: #f3f4f6; color: #6b7280; }
    .best { font-size: 9px; font-weight: 700; color: #059669; margin-left: 4px; }
    .footer { margin-top: 32px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="logo">AGENCY <span>C</span>ONNECTOR &nbsp;·&nbsp; Quote Connector</div>
  <h1>Quote Comparison</h1>
  <div class="meta">
    ${app?.insured_name ?? ''} &nbsp;·&nbsp; ${app?.state ?? ''} &nbsp;·&nbsp;
    NCCI ${app?.ncci_code ?? ''} &nbsp;·&nbsp; ${app?.industry_label ?? ''} &nbsp;·&nbsp;
    Generated ${date}
  </div>
  <table>
    <thead>
      <tr>
        <th>Carrier</th><th>Status</th><th>Annual Premium</th><th>Notes / Refer Reasons</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    Generated by First Connect Quote Connector &nbsp;·&nbsp; ${date}<br/>
    This comparison is indicative only. Final premiums subject to carrier underwriting approval.
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Clean up after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-b from-brand-50 to-white border-b border-gray-100">
            <div className="flex items-start justify-between px-6 pt-5">
              <div>
                <h1 className="text-xl font-bold text-brand-600">Quote Comparison</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {app?.insured_name ?? '…'} · {app?.state} · NCCI {app?.ncci_code} ·{' '}
                  {allResponded
                    ? `All ${totalCount} carriers responded`
                    : `${respondedCount} of ${totalCount} carriers responded`}
                </p>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={downloadPDF} className="h-7 px-3 border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-500 hover:bg-gray-50">↓ PDF</button>
                <button onClick={downloadCSV} className="h-7 px-3 border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-500 hover:bg-gray-50">↓ CSV</button>
              </div>
            </div>
            <ProgressSteps current={3} />
          </div>

          {/* Table */}
          <div className="px-6 py-5">
            <table className="w-full">
              <thead>
                <tr>
                  {['Carrier','Status','Annual Premium','Action'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide pb-3 border-b border-gray-100 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totalCount === 0 && (
                  <tr><td colSpan={4} className="text-xs text-gray-400 py-8 text-center">Loading…</td></tr>
                )}
                {/* Show a row for each selected carrier, even before quotes arrive */}
                {(app?.selected_carrier_ids ?? []).map((cid) => {
                  const quote   = sorted.find((q) => q.carrier_id === cid)
                  const carrier = getCarrier(cid)
                  const status  = quote?.status ?? 'pending'
                  const isBest  = status === 'quotable' && quote?.premium_annual === bestPremium && sorted.filter((q) => q.status === 'quotable').length >= 1

                  // Which NAICS/NCCI code was sent to this carrier
                  const codeLabel = carrier?.class_code_std === 'NAICS'
                    ? `NAICS — translated from NCCI ${app?.ncci_code}`
                    : `NCCI ${app?.ncci_code}`

                  return (
                    <tr key={cid} className={`border-b border-gray-50 last:border-0 ${status === 'pending' ? 'bg-gray-50/50' : ''}`}>
                      <td className="py-4 pr-4">
                        <p className="text-sm font-semibold text-gray-900">{carrier?.name ?? cid}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{codeLabel}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CHIP[status] ?? STATUS_CHIP.pending}`}>
                          {STATUS_LABEL[status] ?? STATUS_LABEL.pending}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        {status === 'quotable' && quote?.premium_annual ? (
                          <div>
                            <p className="text-base font-bold text-gray-900">${quote.premium_annual.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">per year</p>
                            {isBest && <p className="text-[9px] font-bold text-green-600 mt-0.5">★ Best price</p>}
                          </div>
                        ) : status === 'pending' ? (
                          <div className="skeleton h-4 w-20 rounded" />
                        ) : status === 'refer' ? (
                          <p className="text-xs text-amber-600">Under review</p>
                        ) : status === 'decline' ? (
                          <p className="text-xs text-red-400">—</p>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-4">
                        {status === 'quotable' ? (
                          <button className={`h-8 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
                            isBest
                              ? 'bg-brand-600 hover:bg-brand-700 text-white'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}>
                            Select &amp; Bind →
                          </button>
                        ) : status === 'refer' ? (
                          <button className="h-8 px-3 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-600 hover:bg-amber-50">
                            Learn more
                          </button>
                        ) : status === 'decline' ? (
                          <div className="relative" ref={openTooltip === cid ? tooltipRef : undefined}>
                            <button
                              onClick={() => setTooltip(openTooltip === cid ? null : cid)}
                              className="text-[12px] text-gray-400 underline decoration-dotted underline-offset-[3px] hover:text-gray-600 transition-colors cursor-pointer bg-transparent border-none p-0"
                            >
                              Why declined?
                            </button>
                            {openTooltip === cid && (
                              <div className="absolute bottom-full mb-2 right-0 z-20 w-72 bg-gray-900 text-white rounded-xl shadow-xl p-4">
                                {/* Arrow */}
                                <div className="absolute top-full right-4 border-[7px] border-transparent border-t-gray-900" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">
                                  Decline reason
                                </p>
                                <p className="text-xs leading-relaxed text-gray-200">
                                  {quote?.refer_reasons && quote.refer_reasons.length > 0
                                    ? quote.refer_reasons.join(' · ')
                                    : "This risk falls outside the carrier's appetite for this class code and state."}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-3 pt-2 border-t border-gray-700">
                                  Other carriers in this comparison may still quote this risk.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : status === 'pending' ? (
                          <div className="skeleton h-7 w-24 rounded-lg" />
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!allResponded && (
              <p className="text-[10px] text-gray-400 mt-3">
                Awaiting {totalCount - respondedCount} carrier{totalCount - respondedCount !== 1 ? 's' : ''} · Results appear as they arrive
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50">
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              {allResponded
                ? '✉ Final comparison emailed to chris@agency.com'
                : '✉ Comparison will be emailed once all carriers respond'}
            </p>
            <button
              onClick={() => router.push('/quote')}
              className="h-8 px-3 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100"
            >
              New Comparison
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function ResultsPage() {
  return <Suspense><ResultsInner /></Suspense>
}
