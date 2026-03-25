// Auto-maintained TypeScript types matching the Supabase schema

export type Platform = 'whatsapp' | 'instagram'
export type TriggerType = 'single' | 'multi' | 'any'
export type ActionType = 'replier' | 'form' | 'query'
export type InputType = 'text' | 'choice'
export type ValidationType = 'none' | 'email' | 'phone' | 'date' | 'name' | 'number'
export type ConditionOperator = 'eq' | 'neq' | 'contains'
export type AnalyticsEventType =
  | 'trigger_fired'
  | 'form_started'
  | 'form_completed'
  | 'form_abandoned'
  | 'question_answered'
  | 'question_abandoned'
  | 'query_opened'

// ─── Tables ──────────────────────────────────────────────────

export interface CustomerProfile {
  id: string
  user_id: string
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface Bot {
  id: string
  customer_id: string
  name: string
  fallback_message: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlatformConfig {
  id: string
  bot_id: string
  platform: Platform
  phone_number_id: string | null   // WhatsApp only
  waba_id: string | null           // WhatsApp only
  page_id: string | null           // Instagram only
  access_token: string
  verify_token: string
  session_expiry_ms: number
  warning_time_ms: number
  warning_message: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Trigger {
  id: string
  bot_id: string
  name: string
  trigger_type: TriggerType
  platforms: Platform[]
  action_type: ActionType
  created_at: string
  updated_at: string
}

export interface TriggerKeyword {
  id: string
  trigger_id: string
  keyword: string
  created_at: string
}

export interface ReplierAction {
  id: string
  trigger_id: string
  message_text: string
  created_at: string
  updated_at: string
}

export interface ReplierButton {
  id: string
  replier_id: string
  button_label: string
  links_to_trigger_id: string | null
  order_index: number
  created_at: string
}

export interface Form {
  id: string
  trigger_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface FormQuestion {
  id: string
  form_id: string
  order_index: number
  question_text: string
  input_type: InputType
  validation_type: ValidationType
  is_required: boolean
  reference_question_id: string | null
  created_at: string
  updated_at: string
}

export interface FormQuestionOption {
  id: string
  question_id: string
  option_label: string
  order_index: number
  created_at: string
}

export interface FormCondition {
  id: string
  question_id: string
  condition_question_id: string
  condition_operator: ConditionOperator
  condition_value: string
  created_at: string
}

export interface QueryBuilder {
  id: string
  trigger_id: string
  created_at: string
}

export interface QueryCategory {
  id: string
  query_builder_id: string
  category_name: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface QueryQuestion {
  id: string
  category_id: string
  question_text: string
  answer_text: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  sender_id: string
  platform: Platform
  started_at: string
  completed_at: string | null
  is_complete: boolean
  created_at: string
}

export interface FormResponseAnswer {
  id: string
  response_id: string
  question_id: string
  answer_text: string
  created_at: string
}

export interface AnalyticsEvent {
  id: string
  bot_id: string
  event_type: AnalyticsEventType
  trigger_id: string | null
  question_id: string | null
  platform: Platform | null
  sender_id: string | null
  created_at: string
}

// ─── Joined / Extended types (for UI use) ────────────────────

export interface TriggerWithKeywords extends Trigger {
  trigger_keywords: TriggerKeyword[]
}

export interface FormWithQuestions extends Form {
  form_questions: (FormQuestion & {
    form_question_options: FormQuestionOption[]
    form_conditions: FormCondition[]
  })[]
}

export interface QueryBuilderWithCategories extends QueryBuilder {
  query_categories: (QueryCategory & {
    query_questions: QueryQuestion[]
  })[]
}

export interface ReplierWithButtons extends ReplierAction {
  replier_buttons: ReplierButton[]
}

export interface FormResponseWithAnswers extends FormResponse {
  form_response_answers: FormResponseAnswer[]
}
