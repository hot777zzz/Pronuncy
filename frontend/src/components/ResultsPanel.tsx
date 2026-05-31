import { useState, useCallback, useMemo } from 'react'
import type { AssessmentResult } from '../services/api'
import { useI18n } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/translations'
import {
  playAudioSlice,
  computeWordSlices,
  clearAudioCache,
} from '../services/phonemeAudio'

const API_BASE = 'http://localhost:8000'

interface Props {
  result: AssessmentResult | null
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-brand-green'
  if (score >= 50) return 'text-brand-orange'
  return 'text-red-500'
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-50 border-brand-green'
  if (score >= 50) return 'bg-orange-50 border-brand-orange'
  return 'bg-red-50 border-red-500'
}

function scoreMessage(score: number): TranslationKey {
  if (score >= 80) return 'scoreGreat'
  if (score >= 50) return 'scoreGood'
  return 'scorePoor'
}

type PlayKind = 'sentence-std' | 'sentence-me' | 'word-me' | 'phoneme-me'

export default function ResultsPanel({ result }: Props) {
  const { t } = useI18n()
  const [activePlay, setActivePlay] = useState<{ kind: PlayKind; idx: number } | null>(null)

  const trimmedUrl = result?.trimmed_audio_url
    ? `${API_BASE}${result.trimmed_audio_url}`
    : null

  // Reset cache when result changes
  useMemo(() => { clearAudioCache() }, [result])

  // Compute word-level slices from alignment timestamps
  const wordSlices = useMemo(() => {
    if (!result) return []
    return computeWordSlices(result.word_groups, result.alignment)
  }, [result])

  const doPlay = useCallback((kind: PlayKind, idx: number, fn: () => Promise<void>) => {
    speechSynthesis.cancel()
    setActivePlay({ kind, idx })
    fn().then(() => setActivePlay(null))
  }, [])

  // ── sentence ──
  const handleSentenceStd = useCallback(() => {
    if (!result) return
    doPlay('sentence-std', -1, () => {
      const utt = new SpeechSynthesisUtterance(result.target_text)
      utt.lang = 'en-US'; utt.rate = 0.85
      return new Promise(r => { utt.onend = () => r(); speechSynthesis.speak(utt) })
    })
  }, [result, doPlay])

  const handleSentenceMe = useCallback(() => {
    if (!trimmedUrl) return
    doPlay('sentence-me', -1, () => playAudioSlice(trimmedUrl, 0, Infinity))
  }, [trimmedUrl, doPlay])

  // ── word ──
  const handleWordStd = useCallback((word: string) => {
    doPlay('sentence-std', -1, () => {
      const utt = new SpeechSynthesisUtterance(word)
      utt.lang = 'en-US'; utt.rate = 0.85
      return new Promise(r => { utt.onend = () => r(); speechSynthesis.speak(utt) })
    })
  }, [doPlay])

  const handleWordMe = useCallback((i: number) => {
    if (!trimmedUrl || !wordSlices[i]) return
    const { startMs, endMs } = wordSlices[i]
    doPlay('word-me', i, () => playAudioSlice(trimmedUrl, startMs, endMs))
  }, [trimmedUrl, wordSlices, doPlay])

  // Map each alignment index to the target word that contains this phoneme
  const wordForAlignmentIndex = useMemo(() => {
    if (!result) return []
    const { alignment, word_groups } = result
    const map: (string | null)[] = new Array(alignment.length).fill(null)
    let expectedIdx = 0
    for (let i = 0; i < alignment.length; i++) {
      if (alignment[i].expected !== null) {
        for (const wg of word_groups) {
          if (expectedIdx >= wg.phoneme_start && expectedIdx < wg.phoneme_end) {
            map[i] = wg.word
            break
          }
        }
        expectedIdx++
      }
    }
    return map
  }, [result])

  // ── phoneme ──
  const handlePhonemeStd = useCallback((word: string | null) => {
    if (!word) return
    doPlay('sentence-std', -1, () => {
      const utt = new SpeechSynthesisUtterance(word)
      utt.lang = 'en-US'; utt.rate = 0.65
      return new Promise(r => { utt.onend = () => r(); speechSynthesis.speak(utt) })
    })
  }, [doPlay])

  const handlePhonemeMe = useCallback((i: number) => {
    if (!trimmedUrl || !result) return
    const a = result.alignment[i]
    if (a?.start_ms == null || a?.end_ms == null) return
    doPlay('phoneme-me', i, () => playAudioSlice(trimmedUrl, a.start_ms!, a.end_ms!))
  }, [trimmedUrl, result, doPlay])

  if (!result) return null

  const { overall_score, alignment, target_text } = result

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Score */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <div className="flex flex-col items-center gap-3">
            <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center ${scoreBg(overall_score)}`}>
              <span className={`text-4xl font-extrabold ${scoreColor(overall_score)}`}>{overall_score}%</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">{t('scoreGreat') === t(scoreMessage(overall_score)) ? 'Overall' : 'Overall'}</p>
          </div>
          {result.acoustic_score != null && (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-20 h-20 rounded-full border-3 flex items-center justify-center ${result.acoustic_score >= 80 ? 'bg-blue-50 border-blue-400' : result.acoustic_score >= 50 ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-400'}`}>
                <span className={`text-2xl font-extrabold ${result.acoustic_score >= 80 ? 'text-blue-500' : result.acoustic_score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{result.acoustic_score}%</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Acoustic</p>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 text-center mt-4">{t(scoreMessage(overall_score))}</p>
      </div>

      {/* Full sentence */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Full Sentence</h3>
        <p className="text-xl font-semibold text-gray-900 mb-1">{target_text}</p>
        {result.recognized_text && result.recognized_text.toLowerCase() !== target_text.toLowerCase() && (
          <p className="text-sm text-gray-400 mb-4 italic">Heard: "{result.recognized_text}"</p>
        )}
        {result.recognized_text && result.recognized_text.toLowerCase() === target_text.toLowerCase() && (
          <p className="text-sm text-gray-300 mb-4">Heard: "{result.recognized_text}"</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleSentenceStd} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activePlay?.kind === 'sentence-std' ? 'bg-brand-green text-white' : 'bg-green-50 text-brand-green hover:bg-green-100'}`}>
            <SpeakerIcon /> Standard
          </button>
          {trimmedUrl && (
            <button onClick={handleSentenceMe} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activePlay?.kind === 'sentence-me' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <MicIcon /> My Voice
            </button>
          )}
        </div>
      </div>

      {/* Word-level */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-6">{t('wordByWord')}</h3>
        <div className="flex flex-wrap gap-4">
          {result.word_groups.map((wg, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border min-w-[6rem] ${wg.score >= 80 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <span className={`text-lg font-bold ${wg.score >= 80 ? 'text-brand-green' : 'text-brand-orange'}`}>{wg.word}</span>
              <span className="text-xs text-gray-400">{wg.score}%</span>
              <div className="flex gap-1.5 mt-1">
                <button onClick={() => handleWordStd(wg.word)} className="p-1.5 rounded-full bg-white/70 hover:bg-white text-gray-500 transition-colors" title="Standard"><SpeakerIcon /></button>
                {wordSlices[i] && trimmedUrl && (
                  <button onClick={() => handleWordMe(i)} className={`p-1.5 rounded-full transition-colors ${activePlay?.kind === 'word-me' && activePlay?.idx === i ? 'bg-gray-800 text-white' : 'bg-white/70 hover:bg-white text-gray-500'}`} title="Your voice"><MicIcon /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phoneme-level */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">{t('soundBySound')}</h3>

        <div className="flex gap-4 mb-5 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-green/30" /> {t('legendCorrect')}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-orange/30" /> {t('legendOff')}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/20" /> {t('legendMissing')}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200" /> {t('legendExtra')}</span>
          <span className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
            <SpeakerIcon tiny /> standard &nbsp; <MicIcon tiny /> your voice
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {alignment.map((item, i) => {
            const color =
              item.status === 'correct' ? 'bg-green-50 text-brand-green border-green-200'
              : item.status === 'substitution' ? 'bg-orange-50 text-brand-orange border-orange-200'
              : item.status === 'deletion' ? 'bg-red-50 text-red-500 border-red-200'
              : 'bg-gray-50 text-gray-400 border-gray-200'

            const isActive = activePlay?.kind === 'phoneme-me' && activePlay?.idx === i
            const hasTimestamp = item.start_ms != null && item.end_ms != null

            const ac = item.acoustic
            const acDot =
              ac?.quality === 'good' ? 'bg-blue-400'
              : ac?.quality === 'ok' ? 'bg-yellow-400'
              : ac?.quality === 'off' ? 'bg-red-400'
              : ''

            return (
              <div key={i} className={`flex flex-col items-center rounded-xl border min-w-[3.5rem] ${color} ${isActive ? 'ring-2 ring-gray-400 scale-105' : ''} transition-all`}>
                <div className="flex flex-col items-center px-2 pt-1.5 pb-1 relative">
                  <span className="text-[10px] opacity-50">{item.expected ?? '—'}</span>
                  <span className="text-sm font-semibold">{item.recognized ?? '—'}</span>
                  {acDot && (
                    <span className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-full ${acDot}`} title={ac?.detail} />
                  )}
                </div>
                <div className="flex w-full border-t border-inherit">
                  <button
                    onClick={() => handlePhonemeStd(wordForAlignmentIndex[i])}
                    disabled={!wordForAlignmentIndex[i]}
                    className="flex-1 flex items-center justify-center py-1 hover:bg-white/40 transition-colors rounded-bl-xl disabled:opacity-30"
                    title={wordForAlignmentIndex[i] ? `Standard — "${wordForAlignmentIndex[i]}"` : undefined}
                  >
                    <SpeakerIcon tiny />
                  </button>
                  <button
                    onClick={() => handlePhonemeMe(i)}
                    disabled={!hasTimestamp || !trimmedUrl}
                    className="flex-1 flex items-center justify-center py-1 hover:bg-white/40 transition-colors rounded-br-xl border-l border-inherit disabled:opacity-30"
                    title={hasTimestamp ? `Your voice (${item.start_ms}–${item.end_ms}ms)` : 'No timestamp'}
                  >
                    <MicIcon tiny />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          {t('phonemeHint')}
          <br />
          🔊 Standard word &nbsp;|&nbsp; 🎤 Your voice slice &nbsp;|&nbsp;
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> good
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> ok
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> off
            &nbsp;acoustic
          </span>
        </p>
      </div>

      {/* Accent tips */}
      {result.accent_tips.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Pronunciation Tips</h3>
          <div className="space-y-3">
            {result.accent_tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-lg mt-0.5">💡</span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">{tip.pattern}</span>
                    <span className="text-[10px] text-blue-400 uppercase">{tip.frequency === 'very_high' ? 'Very common' : tip.frequency === 'high' ? 'Common' : 'Occasional'}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{tip.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SpeakerIcon({ tiny }: { tiny?: boolean }) {
  const cls = tiny ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.47 4.47 0 0 0 2.5-3.5zM14 3.23v2.06a7.01 7.01 0 0 1 5 6.71 7 7 0 0 1-5 6.71v2.06a9 9 0 0 0 7-8.77 9 9 0 0 0-7-8.77z" />
    </svg>
  )
}

function MicIcon({ tiny }: { tiny?: boolean }) {
  const cls = tiny ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z" />
    </svg>
  )
}
