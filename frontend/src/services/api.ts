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
}

export interface AssessError {
  error: string
}
