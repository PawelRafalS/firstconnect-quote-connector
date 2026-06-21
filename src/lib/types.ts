export type DecisionStatus = 'Quotable' | 'Refer' | 'Decline'
export type QuoteStatus    = 'pending' | 'quotable' | 'refer' | 'decline' | 'error' | 'timeout'
export type AppStatus      = 'draft' | 'submitted' | 'quoting' | 'quoted' | 'bound' | 'expired'
export type QuestionType   = 'boolean' | 'options' | 'numeric' | 'text'
export type QuestionScope  = 'shared' | 'carrier_specific'

export interface ClassCodeMapping {
  ncci_code:      string
  naics_code:     string | null
  sic_code:       string | null
  industry_label: string
  keywords:       string[]   // for search
}

export interface Carrier {
  id:              string   // 'pieco' | 'amtrust'
  name:            string
  class_code_std:  'NCCI' | 'NAICS' | 'SIC'
  logo_initials:   string
  avg_response_ms: number
}

export interface CarrierRule {
  carrier:           string
  answer_value?:     string
  range_min?:        number
  range_max?:        number | null  // null = unbounded
  decision_status:   DecisionStatus
  unlocks?:          string[]       // question keys to show after this answer
}

export interface Question {
  key:                string         // shared_question_key or internal_key
  scope:              QuestionScope
  carrier?:           string         // set when scope = 'carrier_specific'
  question_type:      QuestionType
  question_unit?:     string
  question_content:   string
  is_sub_question:    boolean
  parent_key?:        string
  trigger_value?:     string         // parent answer that shows this question
  options?:           string[]
  appears_in:         { pieco?: string[]; amtrust?: string[] }
  carrier_rules:      CarrierRule[]
  threshold_conflict?: boolean
}

export interface Application {
  id:                   string
  insured_name:         string
  ein?:                 string
  state:                string
  ncci_code:            string
  industry_label:       string
  annual_payroll:       number
  employee_count:       number
  selected_carrier_ids: string[]
  status:               AppStatus
}

export interface AnswerMap {
  [question_key: string]: string
}

export interface Quote {
  id:              string
  application_id:  string
  carrier_id:      string
  status:          QuoteStatus
  premium_annual?: number
  refer_reasons?:  string[]
  responded_at?:   string
}
