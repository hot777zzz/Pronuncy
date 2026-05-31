// ── IPA → example word (for TTS reference) ──
const IPA_EXAMPLE: Record<string, string> = {
  'ɑ': 'father', 'æ': 'cat', 'ʌ': 'cup', 'ɔ': 'caught',
  'aʊ': 'cow', 'aɪ': 'buy', 'ɛ': 'bed', 'ɝ': 'bird',
  'eɪ': 'bay', 'ɪ': 'bit', 'i': 'beat', 'oʊ': 'boat',
  'ɔɪ': 'boy', 'ʊ': 'book', 'u': 'boot',
  'b': 'bat', 'tʃ': 'church', 'd': 'dog', 'ð': 'this',
  'f': 'fan', 'ɡ': 'go', 'h': 'hat', 'dʒ': 'judge',
  'k': 'cat', 'l': 'leg', 'm': 'man', 'n': 'net',
  'ŋ': 'sing', 'p': 'pat', 'ɹ': 'red', 's': 'sun',
  'ʃ': 'shoe', 't': 'ten', 'θ': 'thin', 'v': 'van',
  'w': 'wet', 'j': 'yes', 'z': 'zip', 'ʒ': 'measure',
}

export function getExampleWord(ipa: string): string | null {
  return IPA_EXAMPLE[ipa] ?? null
}

// ── TTS ──
export function speakText(text: string): void {
  speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-US'; utt.rate = 0.85
  speechSynthesis.speak(utt)
}

export function speakPhoneme(ipa: string): void {
  const word = IPA_EXAMPLE[ipa]
  if (!word) return
  speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(word)
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
