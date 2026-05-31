import type { AssessmentResult, CurrentModel } from '../services/api'

const API_BASE = 'http://localhost:8000'

export async function getCurrentModel(): Promise<CurrentModel> {
  const resp = await fetch(`${API_BASE}/model`)
  if (!resp.ok) throw new Error(`Failed to fetch model info: ${resp.status}`)
  return resp.json()
}

export async function assessPronunciation(
  audio: Blob,
  targetText: string,
): Promise<AssessmentResult> {
  const formData = new FormData()
  formData.append('audio', audio, 'recording.wav')
  formData.append('target_text', targetText)

  const resp = await fetch(`${API_BASE}/assess`, {
    method: 'POST',
    body: formData,
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `Server error: ${resp.status}` }))
    throw new Error(err.error || `Server error: ${resp.status}`)
  }

  return resp.json()
}
