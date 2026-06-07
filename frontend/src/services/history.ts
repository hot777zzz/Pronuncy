import type { AssessmentResult, HistoryListResponse, ProgressResponse } from './api'

const API_BASE = 'http://localhost:8000'

export async function getHistory(
  sessionId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<HistoryListResponse> {
  const params = new URLSearchParams({ session_id: sessionId, limit: String(limit), offset: String(offset) })
  const resp = await fetch(`${API_BASE}/history?${params}`)
  if (!resp.ok) throw new Error(`Failed to fetch history: ${resp.status}`)
  return resp.json()
}

export async function getAssessment(assessmentId: string): Promise<AssessmentResult> {
  const resp = await fetch(`${API_BASE}/history/${assessmentId}`)
  if (!resp.ok) {
    if (resp.status === 404) throw new Error('Assessment not found')
    throw new Error(`Failed to fetch assessment: ${resp.status}`)
  }
  return resp.json()
}

export async function getProgress(
  sessionId: string,
  phoneme?: string,
): Promise<ProgressResponse> {
  const params = new URLSearchParams({ session_id: sessionId })
  if (phoneme) params.set('phoneme', phoneme)
  const resp = await fetch(`${API_BASE}/history/progress?${params}`)
  if (!resp.ok) throw new Error(`Failed to fetch progress: ${resp.status}`)
  return resp.json()
}
