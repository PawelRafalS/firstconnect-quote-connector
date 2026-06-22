import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { simulateCarrierQuote } from '@/lib/carriers'

export async function POST(req: NextRequest) {
  const { application_id } = await req.json()
  if (!application_id) return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })

  const supabase = await createClient()

  // Load application
  const { data: app } = await supabase
    .from('applications')
    .select('*')
    .eq('id', application_id)
    .single()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  // Load answers
  const { data: answerRows } = await supabase
    .from('application_answers')
    .select('question_key, raw_value')
    .eq('application_id', application_id)

  const answers: Record<string, string> = {}
  answerRows?.forEach((row: { question_key: string; raw_value: string }) => {
    answers[row.question_key] = row.raw_value
  })

  // Mark application as quoting
  await supabase.from('applications').update({ status: 'quoting' }).eq('id', application_id)

  // Run carrier simulations in parallel and AWAIT before responding.
  // On serverless (Vercel), fire-and-forget is not safe — the function context
  // is frozen after the response is sent, so background Promises never complete.
  // Carriers run concurrently: total wait ≈ max(individual latencies) ~3–4s.
  const carriers: string[] = app.selected_carrier_ids ?? []
  await Promise.all(
    carriers.map((cid: string) =>
      simulateCarrierQuote(
        application_id,
        cid,
        app.ncci_code,
        app.annual_payroll ?? 100000,
        app.employee_count ?? 10,
        answers,
      )
    )
  )

  await supabase.from('applications').update({ status: 'quoted' }).eq('id', application_id)

  return NextResponse.json({ ok: true, carriers })
}
