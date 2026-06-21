/**
 * Carrier rules engine + simulation layer.
 * This is the rules layer (D3): per-carrier interpretation of raw answers.
 * Runs server-side only — never exposed to the client.
 */

import type { AnswerMap, DecisionStatus, QuoteStatus } from './types'
import { ALL_QUESTIONS, CARRIERS } from './questions'
import { createClient } from './supabase/server'

// ── Rules evaluation ────────────────────────────────────────────

function evaluateRule(
  raw_value: string,
  rules: { answer_value?: string; range_min?: number; range_max?: number | null; decision_status: DecisionStatus }[],
  carrier_id: string,
): DecisionStatus | null {
  const carrier_rules = rules.filter((r) => (r as { carrier?: string }).carrier === carrier_id)
  const numeric = parseFloat(raw_value)

  for (const rule of carrier_rules) {
    if (rule.answer_value !== undefined) {
      // Exact match (boolean / options / text)
      if (rule.answer_value === raw_value || rule.answer_value === 'text') return rule.decision_status
    } else {
      // Range match (numeric)
      if (isNaN(numeric)) continue
      const above_min = rule.range_min === undefined || numeric >= rule.range_min
      const below_max = rule.range_max === null || rule.range_max === undefined || numeric < rule.range_max
      if (above_min && below_max) return rule.decision_status
    }
  }
  return null
}

/** Worst-case decision across all evaluated questions for one carrier */
function worstDecision(decisions: DecisionStatus[]): DecisionStatus {
  if (decisions.includes('Decline')) return 'Decline'
  if (decisions.includes('Refer'))   return 'Refer'
  return 'Quotable'
}

/** Run the full rules engine for one carrier against all provided answers */
export function runRulesEngine(
  carrier_id: string,
  ncci_code: string,
  answers: AnswerMap,
): { decision: DecisionStatus; refer_reasons: string[] } {
  const decisions: DecisionStatus[] = []
  const refer_reasons: string[] = []

  for (const question of ALL_QUESTIONS) {
    const key = question.key
    const raw = answers[key]
    if (!raw || !question.carrier_rules.length) continue

    const decision = evaluateRule(raw, question.carrier_rules as never[], carrier_id)
    if (!decision) continue
    decisions.push(decision)
    if (decision === 'Refer')   refer_reasons.push(question.question_content.slice(0, 60) + '…')
    if (decision === 'Decline') refer_reasons.push(`DECLINE: ${question.question_content.slice(0, 55)}…`)
  }

  return { decision: worstDecision(decisions), refer_reasons }
}

// ── Premium simulation ──────────────────────────────────────────

/** Generate a realistic simulated premium. NOT real underwriting math. */
function simulatePremium(
  carrier_id: string,
  ncci_code: string,
  annual_payroll: number,
  _employee_count: number,
): number {
  // Base rates per $100 payroll by class code (illustrative)
  const base_rates: Record<string, Record<string, number>> = {
    pieco:   { '0005': 8.20, '8803': 0.55, '9083': 2.80 },
    amtrust: { '0005': 7.90, '8803': 0.48, '9083': 2.60 },
  }
  const rate = base_rates[carrier_id]?.[ncci_code] ?? 2.00
  const payroll_hundreds = annual_payroll / 100
  const base = payroll_hundreds * rate

  // Small noise per carrier to create realistic spread
  const noise = carrier_id === 'pieco' ? 1.04 : 0.97
  return Math.round(base * noise / 10) * 10  // round to nearest $10
}

// ── Main simulation entry point ─────────────────────────────────

export async function simulateCarrierQuote(
  application_id: string,
  carrier_id: string,
  ncci_code: string,
  annual_payroll: number,
  employee_count: number,
  answers: AnswerMap,
): Promise<void> {
  const carrier = CARRIERS.find((c) => c.id === carrier_id)
  if (!carrier) return

  // Simulate API latency
  await new Promise((r) => setTimeout(r, carrier.avg_response_ms + Math.random() * 400))

  const { decision, refer_reasons } = runRulesEngine(carrier_id, ncci_code, answers)

  let status: QuoteStatus = 'error'
  let premium_annual: number | null = null
  const response_reasons: string[] = []

  switch (decision) {
    case 'Quotable':
      status = 'quotable'
      premium_annual = simulatePremium(carrier_id, ncci_code, annual_payroll, employee_count)
      break
    case 'Refer':
      status = 'refer'
      response_reasons.push(...refer_reasons.filter((r) => !r.startsWith('DECLINE')))
      break
    case 'Decline':
      status = 'decline'
      response_reasons.push(...refer_reasons.filter((r) => r.startsWith('DECLINE')).map((r) => r.replace('DECLINE: ', '')))
      break
    default:
      status = 'error'
  }

  // Write result to Supabase
  const supabase = await createClient()
  await supabase
    .from('quotes')
    .upsert({
      application_id,
      carrier_id,
      status,
      premium_annual,
      refer_reasons: response_reasons.length ? response_reasons : null,
      carrier_response_raw: { decision, simulated: true, evaluated_at: new Date().toISOString() },
      responded_at: new Date().toISOString(),
    }, { onConflict: 'application_id,carrier_id' })
}
