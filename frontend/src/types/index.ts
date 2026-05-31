export interface PhonemeScore {
  phoneme: string;
  score: number;
  correct: boolean;
}

export interface AssessmentResult {
  word: string;
  overall_score: number;
  phoneme_scores: PhonemeScore[];
  recognized_text: string;
  duration_ms: number;
}

export interface RecordingState {
  isRecording: boolean;
  blob: Blob | null;
  url: string | null;
}
