export interface AcousticDetail {
  phoneme: string
  start_ms: number
  end_ms: number
  quality: 'good' | 'ok' | 'off'
  score: number
  detail: string
  tip: string
  features?: Record<string, number>
}

export interface AlignmentItem {
  expected: string | null
  recognized: string | null
  status: 'correct' | 'substitution' | 'deletion' | 'insertion'
  start_ms: number | null
  end_ms: number | null
  acoustic: AcousticDetail | null
}

export interface WordGroup {
  word: string
  phoneme_start: number
  phoneme_end: number
  score: number
}

export interface AccentTip {
  phoneme: string
  pattern: string
  frequency: 'very_high' | 'high' | 'medium' | 'low'
  tip: string
}

export interface ModelInfo {
  id: string
  size: string
  accuracy: string
  desc: string
  recommended: boolean
}

export interface CurrentModel {
  current: string
  available: ModelInfo[]
}

export interface AssessmentResult {
  overall_score: number
  acoustic_score: number | null
  alignment: AlignmentItem[]
  expected_phones: string[]
  recognized_phones: string[]
  target_text: string
  recognized_text: string | null
  word_groups: WordGroup[]
  accent_tips: AccentTip[]
  trimmed_audio_url: string | null
  assessment_id: string
  session_id: string
}

export interface AssessError {
  error: string
}

// v0.4: Agent types
export interface AgentFeedbackRequest {
  assessment_id: string
  force?: boolean
}

export interface StreamEvent {
  event: 'thinking' | 'tool_call' | 'tool_result' | 'section' | 'text' | 'done'
  data: Record<string, unknown>
}

export interface AgentFeedback {
  assessment_id: string
  accent_tasks: string
  speaking_suggestions: string
  improvement_plan: string
  cached: boolean
}

// v0.5: Chat types
export interface UserConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: number
  // For practice results embedded in chat
  assessmentResult?: AssessmentResult
}

export interface ChatRequest {
  message: string
  session_id: string
  api_key: string
  base_url: string
  model: string
}

export interface HistoryItem {
  id: string
  target_text: string
  overall_score: number
  acoustic_score: number | null
  created_at: string
}

export interface HistoryListResponse {
  items: HistoryItem[]
  total: number
}

export interface ProgressPoint {
  assessment_id: string
  status: string
  recognized_as: string | null
  acoustic_score: number | null
  overall_score: number
  created_at: string
}

export interface PhonemeProgress {
  phoneme: string
  total_attempts: number
  correct_count: number
  average_acoustic: number | null
  average_overall: number | null
  last_practiced: string | null
  recent_history: ProgressPoint[]
}

export interface ProgressResponse {
  phonemes: PhonemeProgress[]
}
