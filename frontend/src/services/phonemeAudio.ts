// ── TTS ──
export function speakText(text: string): void {
  speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-US'; utt.rate = 0.85
  speechSynthesis.speak(utt)
}

// ── Audio buffer cache ──
let cachedUrl: string | null = null
let cachedBuffer: AudioBuffer | null = null

async function loadBuffer(url: string): Promise<AudioBuffer> {
  if (cachedUrl === url && cachedBuffer) return cachedBuffer
  const resp = await fetch(url)
  const arrayBuffer = await resp.arrayBuffer()
  const ctx = new AudioContext()
  const buffer = await ctx.decodeAudioData(arrayBuffer)
  ctx.close()
  cachedUrl = url
  cachedBuffer = buffer
  return buffer
}

export async function playAudioSlice(
  url: string,
  startMs: number,
  endMs: number,
): Promise<void> {
  const buffer = await loadBuffer(url)
  const ctx = new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume()

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  const startSec = Math.max(0, startMs / 1000)
  const endSec = Math.min(buffer.duration, endMs / 1000)
  source.start(0, startSec, endSec - startSec)

  return new Promise<void>(resolve => {
    source.onended = () => { ctx.close(); resolve() }
  })
}

export function clearAudioCache() {
  cachedUrl = null
  cachedBuffer = null
}

// ── Compute word-level slices from alignment timestamps ──
export interface TimeSlice {
  startMs: number
  endMs: number
}

export function computeWordSlices(
  wordGroups: { phoneme_start: number; phoneme_end: number }[],
  alignment: { start_ms: number | null; end_ms: number | null }[],
): (TimeSlice | null)[] {
  return wordGroups.map(wg => {
    let minStart = Infinity
    let maxEnd = 0
    for (let i = wg.phoneme_start; i < wg.phoneme_end; i++) {
      const a = alignment[i]
      if (a?.start_ms != null && a?.end_ms != null) {
        if (a.start_ms < minStart) minStart = a.start_ms
        if (a.end_ms > maxEnd) maxEnd = a.end_ms
      }
    }
    return minStart < Infinity ? { startMs: minStart, endMs: maxEnd } : null
  })
}
