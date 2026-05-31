import { useCallback, useRef, useState } from 'react'

interface RecorderState {
  status: 'idle' | 'requesting' | 'recording' | 'done'
  blob: Blob | null
  url: string | null
  elapsed: number
  error: string | null
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    status: 'idle',
    blob: null,
    url: null,
    elapsed: 0,
    error: null,
  })
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<number>(0)
  const startTime = useRef<number>(0)

  const tick = useCallback(() => {
    setState(s => ({ ...s, elapsed: Date.now() - startTime.current }))
  }, [])

  const cleanup = useCallback(() => {
    clearInterval(timer.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorder.current = null
  }, [])

  const start = useCallback(async () => {
    cleanup()
    chunks.current = []
    setState(s => ({ ...s, status: 'requesting', blob: null, url: null, elapsed: 0, error: null }))

    // 1. Get microphone
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Microphone access denied'
          : err.name === 'NotFoundError'
            ? 'No microphone found'
            : `Microphone error: ${err.message}`
      setState(s => ({ ...s, status: 'idle', error: msg }))
      return
    }

    // 2. Create recorder — let browser pick format
    let mimeType = ''
    for (const mt of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
      if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break }
    }

    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    } catch {
      recorder = new MediaRecorder(stream)
    }
    mediaRecorder.current = recorder

    // 3. Collect data
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data)
    }

    recorder.onstop = () => {
      clearInterval(timer.current)
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null

      if (chunks.current.length === 0) {
        setState(s => ({ ...s, status: 'idle', error: 'No audio captured — try again' }))
        return
      }

      const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' })
      const url = URL.createObjectURL(blob)
      setState(s => ({ ...s, status: 'done', blob, url }))
    }

    recorder.onerror = () => {
      cleanup()
      setState(s => ({ ...s, status: 'idle', error: 'Recording hardware error' }))
    }

    // 4. Start — timeslice ensures periodic ondataavailable
    recorder.start(250)
    startTime.current = Date.now()
    setState(s => ({ ...s, status: 'recording' }))
    timer.current = window.setInterval(tick, 200)
  }, [tick, cleanup])

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    cleanup()
    if (state.url) URL.revokeObjectURL(state.url)
    setState({ status: 'idle', blob: null, url: null, elapsed: 0, error: null })
  }, [state.url, cleanup])

  return { ...state, start, stop, reset }
}
