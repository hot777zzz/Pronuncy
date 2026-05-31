export interface AlignmentItem {
  expected: string | null
  recognized: string | null
  status: 'correct' | 'substitution' | 'deletion' | 'insertion'
  start_ms: number | null
  end_ms: number | null
}

export interface WordGroup {
  word: string
  phoneme_start: number
  phoneme_end: number
  score: number
}

export interface AssessmentResult {
  overall_score: number
  alignment: AlignmentItem[]
  expected_phones: string[]
  recognized_phones: string[]
  target_text: string
  recognized_text: string | null
  word_groups: WordGroup[]
  trimmed_audio_url: string | null
}

export interface AssessError {
  error: string
}
