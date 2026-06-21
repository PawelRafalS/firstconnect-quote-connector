/**
 * Canonical question registry — derived from question-taxonomy.json
 * This is the question layer (D3): carrier-agnostic definitions.
 * Carrier rules (the rules layer) live in carriers.ts.
 */

import type { Question, ClassCodeMapping, CarrierRule } from './types'

// ── Class code crosswalk (NCCI is canonical — D4) ──────────────
export const CLASS_CODE_MAPPINGS: ClassCodeMapping[] = [
  {
    ncci_code:      '0005',
    naics_code:     '1110',
    sic_code:       '0100',
    industry_label: 'Farming & Agricultural Operations',
    keywords:       ['farm', 'farming', 'agriculture', 'agricultural', 'crop', 'harvest', 'livestock'],
  },
  {
    ncci_code:      '8803',
    naics_code:     '6113',
    sic_code:       '8221',
    industry_label: 'Colleges, Universities & Schools',
    keywords:       ['college', 'university', 'school', 'education', 'academic', 'campus'],
  },
  {
    ncci_code:      '9083',
    naics_code:     '7221',
    sic_code:       '5812',
    industry_label: 'Restaurants & Food Service',
    keywords:       ['restaurant', 'food', 'dining', 'cafe', 'bar', 'catering', 'kitchen', 'bistro'],
  },
]

export function searchClassCodes(query: string): ClassCodeMapping[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return CLASS_CODE_MAPPINGS.filter(
    (m) =>
      m.keywords.some((k) => k.includes(q)) ||
      m.industry_label.toLowerCase().includes(q) ||
      m.ncci_code.includes(q),
  )
}

export function getClassCodeMapping(ncci_code: string): ClassCodeMapping | undefined {
  return CLASS_CODE_MAPPINGS.find((m) => m.ncci_code === ncci_code)
}

// ── Carrier definitions ─────────────────────────────────────────
export const CARRIERS = [
  {
    id:              'pieco',
    name:            'PIECO Insurance',
    class_code_std:  'NCCI' as const,
    logo_initials:   'PCO',
    avg_response_ms: 1600,
    logo_color:      'bg-blue-100 text-blue-700',
  },
  {
    id:              'amtrust',
    name:            'AmTrust Financial Services',
    class_code_std:  'NAICS' as const,
    logo_initials:   'AMT',
    avg_response_ms: 2900,
    logo_color:      'bg-orange-100 text-orange-700',
  },
]

export function getCarrier(id: string) {
  return CARRIERS.find((c) => c.id === id)
}

// ── The 34 canonical questions ──────────────────────────────────
export const ALL_QUESTIONS: Question[] = [
  // ─ SHARED: appear across both carriers ─────────────────────
  {
    key:              'dba_name_change',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Has the insured operated under a different legal name, legal entity, or doing business as (DBA) name within the last 5 years?',
    is_sub_question:  false,
    appears_in:       { pieco: ['0005','8803','9083'], amtrust: ['1110','6113','7221'] },
    carrier_rules:    [],
  },
  {
    key:              'dba_name_change_detail',
    scope:            'shared',
    question_type:    'text',
    question_content: 'Please provide the prior legal name, DBA name, and a brief description of operations under that name.',
    is_sub_question:  true,
    parent_key:       'dba_name_change',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005','8803','9083'], amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'text', decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'text', decision_status:'Refer' },
    ],
  },
  {
    key:              'excluded_operations',
    scope:            'shared',
    question_type:    'boolean',
    question_content: `Does the insured's business involve any of the following: asbestos or lead abatement; demolition or wrecking; nuclear energy; hazardous materials; aircraft or watercraft; firearm sales; staffing or temporary workers; oil, gas, or mining; marijuana or federally illegal substances?`,
    is_sub_question:  false,
    appears_in:       { pieco: ['0005','8803','9083'], amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Decline' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Decline' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'employee_driving',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Do any employees operate a motor vehicle as part of their job duties?',
    is_sub_question:  false,
    appears_in:       { pieco: ['0005','9083'], amtrust: ['1110','7221'] },
    carrier_rules:    [],
  },
  {
    key:              'employee_driving_pct',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'percent',
    question_content: 'Approximately what percentage of employee work time involves driving?',
    is_sub_question:  true,
    parent_key:       'employee_driving',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005','9083'], amtrust: ['1110','7221'] },
    threshold_conflict: true,
    carrier_rules:    [
      { carrier:'pieco',   range_min:0,  range_max:10,   decision_status:'Quotable' },
      { carrier:'pieco',   range_min:10, range_max:null, decision_status:'Refer' },
      { carrier:'amtrust', range_min:0,  range_max:15,   decision_status:'Quotable' },
      { carrier:'amtrust', range_min:15, range_max:40,   decision_status:'Refer' },
      { carrier:'amtrust', range_min:40, range_max:null, decision_status:'Decline' },
    ],
  },
  {
    key:              'mvr_review',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Are MVRs (Motor Vehicle Records) reviewed for all drivers — by the insured or their commercial auto insurer?',
    is_sub_question:  true,
    parent_key:       'employee_driving',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005','9083'], amtrust: ['1110','7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Refer' },
    ],
  },
  {
    key:              'vehicle_maintenance',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Does the insured have a vehicle inspection and maintenance program in place?',
    is_sub_question:  true,
    parent_key:       'employee_driving',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005','9083'], amtrust: ['1110','7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Refer' },
    ],
  },
  {
    key:              'employees_group_vehicle',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Do 4 or more employees ever travel together in a vehicle at the same time?',
    is_sub_question:  true,
    parent_key:       'employee_driving',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005','9083'], amtrust: [] },
    carrier_rules:    [
      { carrier:'pieco', answer_value:'Yes', decision_status:'Refer' },
      { carrier:'pieco', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'above_below_ground_work',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Do employees perform any work above or below ground level?',
    is_sub_question:  false,
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [],
  },
  {
    key:              'max_height_above_ground',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'ft',
    question_content: 'What is the maximum height above ground at which employees work?',
    is_sub_question:  true,
    parent_key:       'above_below_ground_work',
    trigger_value:    'Yes',
    threshold_conflict: true,
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [
      { carrier:'pieco',   range_min:0,  range_max:25,   decision_status:'Quotable' },
      { carrier:'pieco',   range_min:25, range_max:30,   decision_status:'Refer' },
      { carrier:'pieco',   range_min:30, range_max:null, decision_status:'Decline' },
      { carrier:'amtrust', range_min:0,  range_max:20,   decision_status:'Quotable' },
      { carrier:'amtrust', range_min:20, range_max:35,   decision_status:'Refer' },
      { carrier:'amtrust', range_min:35, range_max:null, decision_status:'Decline' },
    ],
  },
  {
    key:              'ppe_height',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Are employees required to follow OSHA guidelines and use proper PPE (fall protection, harnesses, guardrails) when working at height?',
    is_sub_question:  true,
    parent_key:       'above_below_ground_work',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Decline' },
    ],
  },
  {
    key:              'max_depth_below_ground',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'ft',
    question_content: 'What is the maximum depth below ground at which employees work?',
    is_sub_question:  true,
    parent_key:       'above_below_ground_work',
    trigger_value:    'Yes',
    threshold_conflict: true,
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [
      { carrier:'pieco',   range_min:0, range_max:3,    decision_status:'Quotable' },
      { carrier:'pieco',   range_min:3, range_max:5,    decision_status:'Refer' },
      { carrier:'pieco',   range_min:5, range_max:null, decision_status:'Decline' },
      { carrier:'amtrust', range_min:0, range_max:4,    decision_status:'Quotable' },
      { carrier:'amtrust', range_min:4, range_max:6,    decision_status:'Refer' },
      { carrier:'amtrust', range_min:6, range_max:null, decision_status:'Decline' },
    ],
  },
  {
    key:              'seasonal_workers_pct',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'percent',
    question_content: 'What percentage of the workforce is employed on a seasonal or temporary basis?',
    is_sub_question:  false,
    threshold_conflict: true,
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [
      { carrier:'pieco',   range_min:0,  range_max:30,   decision_status:'Quotable' },
      { carrier:'pieco',   range_min:30, range_max:51,   decision_status:'Refer' },
      { carrier:'pieco',   range_min:51, range_max:null, decision_status:'Decline' },
      { carrier:'amtrust', range_min:0,  range_max:20,   decision_status:'Quotable' },
      { carrier:'amtrust', range_min:20, range_max:45,   decision_status:'Refer' },
      { carrier:'amtrust', range_min:45, range_max:null, decision_status:'Decline' },
    ],
  },
  {
    key:              'mechanization_pct',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'percent',
    question_content: 'What percentage of the harvesting or production process is mechanized?',
    is_sub_question:  false,
    threshold_conflict: true,
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [
      { carrier:'pieco',   range_min:0,  range_max:50,   decision_status:'Refer' },
      { carrier:'pieco',   range_min:50, range_max:null, decision_status:'Quotable' },
      { carrier:'amtrust', range_min:0,  range_max:40,   decision_status:'Decline' },
      { carrier:'amtrust', range_min:40, range_max:70,   decision_status:'Refer' },
      { carrier:'amtrust', range_min:70, range_max:null, decision_status:'Quotable' },
    ],
  },
  {
    key:              'aerial_crop_operations',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Does the insured perform any aerial crop dusting or aerial spraying operations?',
    is_sub_question:  false,
    appears_in:       { pieco: ['0005'], amtrust: ['1110'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Decline' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Decline' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'lifting_over_50lbs',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Are there instances where employees lift objects weighing more than 50 lbs?',
    is_sub_question:  false,
    appears_in:       { pieco: ['0005'], amtrust: [] },
    carrier_rules:    [],
  },
  {
    key:              'max_weight_unassisted',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'lbs',
    question_content: 'What is the maximum weight employees lift unassisted?',
    is_sub_question:  true,
    parent_key:       'lifting_over_50lbs',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005'], amtrust: [] },
    carrier_rules:    [
      { carrier:'pieco', range_min:0,   range_max:100,  decision_status:'Refer' },
      { carrier:'pieco', range_min:100, range_max:null, decision_status:'Decline' },
    ],
  },
  {
    key:              'lifting_safety_devices',
    scope:            'shared',
    question_type:    'text',
    question_content: 'What safety devices or equipment do employees use when lifting heavy items?',
    is_sub_question:  true,
    parent_key:       'lifting_over_50lbs',
    trigger_value:    'Yes',
    appears_in:       { pieco: ['0005'], amtrust: [] },
    carrier_rules:    [
      { carrier:'pieco', answer_value:'text', decision_status:'Quotable' },
    ],
  },
  {
    key:              'international_operations',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Does the insured have any operations or employees based outside the United States?',
    is_sub_question:  false,
    appears_in:       { pieco: ['8803'], amtrust: ['6113'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Refer' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'work_from_home',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Do any employees regularly work from home?',
    is_sub_question:  false,
    appears_in:       { pieco: ['8803'], amtrust: ['6113'] },
    carrier_rules:    [],
  },
  {
    key:              'work_from_home_pct',
    scope:            'shared',
    question_type:    'numeric',
    question_unit:    'percent',
    question_content: 'What percentage of employees work from home on a regular basis?',
    is_sub_question:  true,
    parent_key:       'work_from_home',
    trigger_value:    'Yes',
    threshold_conflict: true,
    appears_in:       { pieco: ['8803'], amtrust: ['6113'] },
    carrier_rules:    [
      { carrier:'pieco',   range_min:0,  range_max:50,   decision_status:'Quotable' },
      { carrier:'pieco',   range_min:50, range_max:90,   decision_status:'Refer' },
      { carrier:'pieco',   range_min:90, range_max:null, decision_status:'Decline' },
      { carrier:'amtrust', range_min:0,  range_max:40,   decision_status:'Quotable' },
      { carrier:'amtrust', range_min:40, range_max:80,   decision_status:'Refer' },
      { carrier:'amtrust', range_min:80, range_max:null, decision_status:'Decline' },
    ],
  },
  {
    key:              'late_night_operations',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Does the insured have any operations after 2:00 AM?',
    is_sub_question:  false,
    appears_in:       { pieco: ['9083'], amtrust: ['7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Refer' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'live_entertainment',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Do any employees or uninsured performers provide live entertainment on the premises?',
    is_sub_question:  false,
    appears_in:       { pieco: ['9083'], amtrust: ['7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Decline' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Decline' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'offpremise_catering',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Does the insured conduct any off-premise catering or food truck operations?',
    is_sub_question:  false,
    appears_in:       { pieco: ['9083'], amtrust: ['7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Refer' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },
  {
    key:              'stair_delivery',
    scope:            'shared',
    question_type:    'boolean',
    question_content: 'Are employees required to regularly carry or deliver food, supplies, or equipment up and down stairs?',
    is_sub_question:  false,
    appears_in:       { pieco: ['9083'], amtrust: ['7221'] },
    carrier_rules:    [
      { carrier:'pieco',   answer_value:'Yes', decision_status:'Refer' },
      { carrier:'pieco',   answer_value:'No',  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Quotable' },
    ],
  },

  // ─ AMTRUST-SPECIFIC ─────────────────────────────────────────
  {
    key:              'safety_training_program',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'boolean',
    question_content: 'Does the insured have a documented safety training program for all employees?',
    is_sub_question:  false,
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Quotable', unlocks:['safety_training_frequency'] },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Refer' },
    ],
  },
  {
    key:              'safety_training_frequency',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'options',
    question_content: 'How frequently is safety training conducted?',
    options:          ['Monthly or more frequently','Quarterly','Annually','No formal schedule'],
    is_sub_question:  true,
    parent_key:       'safety_training_program',
    trigger_value:    'Yes',
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'amtrust', answer_value:'Monthly or more frequently', decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Quarterly',                  decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'Annually',                   decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'No formal schedule',         decision_status:'Refer' },
    ],
  },
  {
    key:              'wc_claims_history',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'boolean',
    question_content: 'Has the insured had any workers\' compensation claims in the past 3 years?',
    is_sub_question:  false,
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [],
  },
  {
    key:              'wc_claims_count',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'options',
    question_content: 'How many workers\' compensation claims has the insured filed in the past 3 years?',
    options:          ['1–2','3–5','6 or more'],
    is_sub_question:  true,
    parent_key:       'wc_claims_history',
    trigger_value:    'Yes',
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'amtrust', answer_value:'1–2',       decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'3–5',       decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'6 or more', decision_status:'Decline' },
    ],
  },
  {
    key:              'wc_claims_total_value',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'options',
    question_unit:    'USD',
    question_content: 'What is the total incurred value of all claims in the past 3 years?',
    options:          ['Under $25,000','$25,000–$100,000','Over $100,000'],
    is_sub_question:  true,
    parent_key:       'wc_claims_history',
    trigger_value:    'Yes',
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'amtrust', answer_value:'Under $25,000',    decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'$25,000–$100,000', decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'Over $100,000',    decision_status:'Decline' },
    ],
  },
  {
    key:              'return_to_work_program',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'boolean',
    question_content: 'Does the insured have a return-to-work program for injured employees?',
    is_sub_question:  false,
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'amtrust', answer_value:'Yes', decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'No',  decision_status:'Refer' },
    ],
  },
  {
    key:              'experience_mod_rate',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'options',
    question_content: 'What is the insured\'s current Experience Modification Rate (e-Mod)?',
    options:          ['Below 1.00 (credit mod)','1.00–1.25','1.25–1.50','Above 1.50','Not yet assigned (new business)'],
    is_sub_question:  false,
    appears_in:       { amtrust: ['1110','6113','7221'] },
    carrier_rules:    [
      { carrier:'amtrust', answer_value:'Below 1.00 (credit mod)',          decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'1.00–1.25',                        decision_status:'Quotable' },
      { carrier:'amtrust', answer_value:'1.25–1.50',                        decision_status:'Refer' },
      { carrier:'amtrust', answer_value:'Above 1.50',                       decision_status:'Decline' },
      { carrier:'amtrust', answer_value:'Not yet assigned (new business)',   decision_status:'Refer' },
    ],
  },
  {
    key:              'alcohol_served',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'boolean',
    question_content: 'Does the insured serve alcohol on the premises?',
    is_sub_question:  false,
    appears_in:       { amtrust: ['7221'] },
    carrier_rules:    [],
  },
  {
    key:              'alcohol_revenue_pct',
    scope:            'carrier_specific',
    carrier:          'amtrust',
    question_type:    'numeric',
    question_unit:    'percent',
    question_content: 'Approximately what percentage of total revenue comes from alcohol sales?',
    is_sub_question:  true,
    parent_key:       'alcohol_served',
    trigger_value:    'Yes',
    appears_in:       { amtrust: ['7221'] },
    carrier_rules:    [
      { carrier:'amtrust', range_min:0,  range_max:30,   decision_status:'Quotable' },
      { carrier:'amtrust', range_min:30, range_max:50,   decision_status:'Refer' },
      { carrier:'amtrust', range_min:50, range_max:null, decision_status:'Decline' },
    ],
  },
]

// ── Form filtering logic ────────────────────────────────────────

/**
 * Returns top-level questions visible for a given session.
 * Filters by (state, ncci_code, selected carriers) and deduplicates shared questions.
 * Sub-questions are excluded here — they are shown conditionally by the form engine.
 */
export function getTopLevelQuestions(
  ncci_code: string,
  selected_carrier_ids: string[],
): Question[] {
  const mapping = getClassCodeMapping(ncci_code)
  if (!mapping) return []

  const naics = mapping.naics_code

  return ALL_QUESTIONS.filter((q) => {
    if (q.is_sub_question) return false

    if (q.scope === 'carrier_specific') {
      // Only show if the specific carrier is selected
      return q.carrier && selected_carrier_ids.includes(q.carrier)
    }

    // Shared: show if any selected carrier needs it
    return selected_carrier_ids.some((cid) => {
      const codes = q.appears_in[cid as keyof typeof q.appears_in] ?? []
      // PIECO uses NCCI, AmTrust uses NAICS — check both
      return codes.includes(ncci_code) || (naics && codes.includes(naics))
    })
  })
}

/**
 * Returns sub-questions triggered by a given parent answer.
 * Filters to only those needed by at least one selected carrier.
 */
export function getSubQuestions(
  parent_key: string,
  trigger_value: string,
  ncci_code: string,
  selected_carrier_ids: string[],
): Question[] {
  const mapping = getClassCodeMapping(ncci_code)
  const naics = mapping?.naics_code

  return ALL_QUESTIONS.filter((q) => {
    if (!q.is_sub_question) return false
    if (q.parent_key !== parent_key) return false
    if (q.trigger_value !== trigger_value) return false

    if (q.scope === 'carrier_specific') {
      return q.carrier && selected_carrier_ids.includes(q.carrier)
    }

    return selected_carrier_ids.some((cid) => {
      const codes = q.appears_in[cid as keyof typeof q.appears_in] ?? []
      return codes.includes(ncci_code) || (naics && codes.includes(naics))
    })
  })
}

/**
 * Returns which carriers need a given question.
 * Used to render carrier badges.
 */
export function getQuestionCarriers(
  question: Question,
  ncci_code: string,
  selected_carrier_ids: string[],
): string[] {
  if (question.scope === 'carrier_specific') {
    return question.carrier ? [question.carrier] : []
  }

  const mapping = getClassCodeMapping(ncci_code)
  const naics = mapping?.naics_code

  return selected_carrier_ids.filter((cid) => {
    const codes = question.appears_in[cid as keyof typeof question.appears_in] ?? []
    return codes.includes(ncci_code) || (naics && codes.includes(naics))
  })
}

/**
 * Count total questions the agent will need to answer (for S3 display).
 * Counts only top-level questions (sub-questions shown conditionally).
 */
export function countQuestionsForCarriers(
  ncci_code: string,
  selected_carrier_ids: string[],
): { total: number; shared: number; carrier_specific: number } {
  const questions = getTopLevelQuestions(ncci_code, selected_carrier_ids)
  const shared = questions.filter((q) => q.scope === 'shared').length
  const carrier_specific = questions.filter((q) => q.scope === 'carrier_specific').length
  return { total: shared + carrier_specific, shared, carrier_specific }
}

/**
 * How many additional questions does adding a carrier cost?
 */
export function additionalQuestionsForCarrier(
  ncci_code: string,
  carrier_id: string,
  already_selected: string[],
): number {
  const without = getTopLevelQuestions(ncci_code, already_selected)
  const with_   = getTopLevelQuestions(ncci_code, [...already_selected, carrier_id])
  return with_.length - without.length
}

// ── Section grouping ────────────────────────────────────────────
export const FORM_SECTIONS = [
  { key: 'business_ops',     label: 'Business Ops' },
  { key: 'risk_factors',     label: 'Risk Factors' },
  { key: 'carrier_specific', label: 'Carrier-Specific' },
] as const

export type SectionKey = typeof FORM_SECTIONS[number]['key']

/** Assign each top-level question to a section */
export function getSectionKey(question: Question): SectionKey {
  if (question.scope === 'carrier_specific') return 'carrier_specific'
  if (['dba_name_change','excluded_operations'].includes(question.key)) return 'business_ops'
  return 'risk_factors'
}
