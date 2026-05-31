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

// ── helpers ──

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald'
  if (score >= 50) return 'text-terracotta'
  return 'text-rose'
}

function scoreRing(score: number) {
  if (score >= 80) return 'border-emerald'
  if (score >= 50) return 'border-terracotta'
  return 'border-rose'
}

function scoreBg(score: number) {
  if (score >= 80) return 'border-emerald/20 bg-emerald/[0.06]'
  if (score >= 50) return 'border-terracotta/20 bg-terracotta/[0.06]'
  return 'border-rose/20 bg-rose/[0.06]'
}

function scoreMessage(score: number): TranslationKey {
  if (score >= 80) return 'scoreGreat'
  if (score >= 50) return 'scoreGood'
  return 'scorePoor'
}

function frequencyLabel(freq: string): TranslationKey {
  if (freq === 'very_high') return 'veryCommon'
  if (freq === 'high') return 'common'
  return 'occasional'
}

function statusCardStyle(status: string) {
  switch (status) {
    case 'correct':
      return 'bg-emerald/[0.06] text-emerald border-emerald/15'
    case 'substitution':
      return 'bg-terracotta/[0.06] text-terracotta border-terracotta/15'
    case 'deletion':
      return 'bg-rose/[0.06] text-rose border-rose/15'
    default:
      return 'bg-ink/[0.03] text-ink-muted border-ink/10'
  }
}

function acQualityColor(quality: string | undefined) {
  switch (quality) {
    case 'good':
      return 'bg-emerald'
    case 'ok':
      return 'bg-amber'
    case 'off':
      return 'bg-rose'
    default:
      return ''
  }
}

type PlayKind = 'sentence-std' | 'sentence-me' | 'word-me' | 'phoneme-me'

// ── component ──

export default function ResultsPanel({ result }: Props) {
  const { t } = useI18n()
  const [activePlay, setActivePlay] = useState<{
    kind: PlayKind
    idx: number
  } | null>(null)

  const trimmedUrl = result?.trimmed_audio_url
    ? `${API_BASE}${result.trimmed_audio_url}`
    : null

  useMemo(() => {
    clearAudioCache()
  }, [result])

  const wordSlices = useMemo(() => {
    if (!result) return []
    return computeWordSlices(result.word_groups, result.alignment)
  }, [result])

  const doPlay = useCallback(
    (kind: PlayKind, idx: number, fn: () => Promise<void>) => {
      speechSynthesis.cancel()
      setActivePlay({ kind, idx })
      fn().then(() => setActivePlay(null))
    },
    [],
  )

  // ── sentence play ──
  const handleSentenceStd = useCallback(() => {
    if (!result) return
    doPlay('sentence-std', -1, () => {
      const utt = new SpeechSynthesisUtterance(result.target_text)
      utt.lang = 'en-US'
      utt.rate = 0.85
      return new Promise(r => {
        utt.onend = () => r()
        speechSynthesis.speak(utt)
      })
    })
  }, [result, doPlay])

  const handleSentenceMe = useCallback(() => {
    if (!trimmedUrl) return
    doPlay('sentence-me', -1, () => playAudioSlice(trimmedUrl, 0, Infinity))
  }, [trimmedUrl, doPlay])

  // ── word play ──
  const handleWordStd = useCallback(
    (word: string) => {
      doPlay('sentence-std', -1, () => {
        const utt = new SpeechSynthesisUtterance(word)
        utt.lang = 'en-US'
        utt.rate = 0.85
        return new Promise(r => {
          utt.onend = () => r()
          speechSynthesis.speak(utt)
        })
      })
    },
    [doPlay],
  )

  const handleWordMe = useCallback(
    (i: number) => {
      if (!trimmedUrl || !wordSlices[i]) return
      const { startMs, endMs } = wordSlices[i]
      doPlay('word-me', i, () =>
        playAudioSlice(trimmedUrl, startMs, endMs),
      )
    },
    [trimmedUrl, wordSlices, doPlay],
  )

  // ── phoneme play ──
  const handlePhonemeStd = useCallback(
    (word: string | null) => {
      if (!word) return
      doPlay('sentence-std', -1, () => {
        const utt = new SpeechSynthesisUtterance(word)
        utt.lang = 'en-US'
        utt.rate = 0.65
        return new Promise(r => {
          utt.onend = () => r()
          speechSynthesis.speak(utt)
        })
      })
    },
    [doPlay],
  )

  const handlePhonemeMe = useCallback(
    (i: number) => {
      if (!trimmedUrl || !result) return
      const a = result.alignment[i]
      if (a?.start_ms == null || a?.end_ms == null) return
      doPlay('phoneme-me', i, () =>
        playAudioSlice(trimmedUrl, a.start_ms!, a.end_ms!),
      )
    },
    [trimmedUrl, result, doPlay],
  )

  // Map alignment index → word
  const wordForAlignmentIndex = useMemo(() => {
    if (!result) return []
    const { alignment, word_groups } = result
    const map: (string | null)[] = new Array(alignment.length).fill(null)
    let expectedIdx = 0
    for (let i = 0; i < alignment.length; i++) {
      if (alignment[i].expected !== null) {
        for (const wg of word_groups) {
          if (
            expectedIdx >= wg.phoneme_start &&
            expectedIdx < wg.phoneme_end
          ) {
            map[i] = wg.word
            break
          }
        }
        expectedIdx++
      }
    }
    return map
  }, [result])

  if (!result) return null

  const { overall_score, alignment, target_text } = result

  return (
    <div className="space-y-5 stagger">
      {/* ═══ Score ═══ */}
      <div className="card-surface p-6 flex items-center justify-center gap-10 flex-wrap">
        {/* Overall */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-28 h-28 rounded-full border-[3px] flex items-center justify-center ${scoreBg(overall_score)} ${scoreRing(overall_score)}`}
          >
            <span
              className={`text-4xl font-display font-bold italic ${scoreColor(overall_score)}`}
            >
              {overall_score}
            </span>
          </div>
          <span className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest">
            {t('overallScore')}
          </span>
        </div>

        {/* Acoustic */}
        {result.acoustic_score != null && (
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${
                result.acoustic_score >= 80
                  ? 'border-emerald/20 bg-emerald/[0.06]'
                  : result.acoustic_score >= 50
                    ? 'border-amber/20 bg-amber/[0.06]'
                    : 'border-rose/20 bg-rose/[0.06]'
              }`}
            >
              <span
                className={`text-2xl font-display font-bold italic ${
                  result.acoustic_score >= 80
                    ? 'text-emerald'
                    : result.acoustic_score >= 50
                      ? 'text-amber'
                      : 'text-rose'
                }`}
              >
                {result.acoustic_score}
              </span>
            </div>
            <span className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest">
              {t('acousticScore')}
            </span>
          </div>
        )}
      </div>

      {/* ═══ Full Sentence ═══ */}
      <div className="card-surface p-6">
        <h3 className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest mb-4">
          {t('fullSentence')}
        </h3>
        <p className="text-xl font-display font-semibold italic text-ink mb-2">
          {target_text}
        </p>
        {result.recognized_text &&
          result.recognized_text.toLowerCase() !==
            target_text.toLowerCase() && (
            <p className="text-sm text-ink-muted/60 mb-4 font-sans">
              {t('heardAs')}:{' '}
              <span className="italic">&ldquo;{result.recognized_text}&rdquo;</span>
            </p>
          )}
        {result.recognized_text &&
          result.recognized_text.toLowerCase() ===
            target_text.toLowerCase() && (
            <p className="text-sm text-ink-muted/30 mb-4 font-sans">
              {t('heardAs')}: &ldquo;{result.recognized_text}&rdquo;
            </p>
          )}

        <div className="flex flex-wrap gap-2.5">
          <PlayPill
            label={t('standard')}
            icon={<SpeakerIcon />}
            active={activePlay?.kind === 'sentence-std'}
            onClick={handleSentenceStd}
            variant="emerald"
          />
          {trimmedUrl && (
            <PlayPill
              label={t('myVoice')}
              icon={<MicIcon />}
              active={activePlay?.kind === 'sentence-me'}
              onClick={handleSentenceMe}
              variant="ink"
            />
          )}
        </div>
      </div>

      {/* ═══ Word-by-Word ═══ */}
      <div className="card-surface p-6">
        <h3 className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest mb-5">
          {t('wordByWord')}
        </h3>
        <div className="flex flex-wrap gap-3">
          {result.word_groups.map((wg, i) => (
            <div
              key={i}
              className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all duration-300 ${
                wg.score >= 80
                  ? 'border-emerald/15 bg-emerald/[0.04] hover:border-emerald/30'
                  : 'border-terracotta/15 bg-terracotta/[0.04] hover:border-terracotta/30'
              }`}
            >
              <button
                onClick={() => handleWordStd(wg.word)}
                className="text-lg font-display font-semibold italic text-ink hover:text-amber transition-colors"
              >
                {wg.word}
              </button>
              <span
                className={`text-xs font-mono font-medium ${
                  wg.score >= 80 ? 'text-emerald' : 'text-terracotta'
                }`}
              >
                {wg.score}%
              </span>
              {wordSlices[i] && trimmedUrl && (
                <button
                  onClick={() => handleWordMe(i)}
                  className={`p-1 rounded-full transition-all ${
                    activePlay?.kind === 'word-me' && activePlay?.idx === i
                      ? 'bg-ink text-white'
                      : 'bg-ink/5 text-ink-muted hover:bg-ink/10'
                  }`}
                  title={t('myVoice')}
                >
                  <MicIcon micro />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Phoneme-by-Phoneme ═══ */}
      <div className="card-surface p-6">
        <h3 className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest mb-3">
          {t('soundBySound')}
        </h3>

        {/* Legend */}
        <div className="flex gap-3 mb-5 text-[11px] text-ink-muted/60 flex-wrap font-sans">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald/30" />{' '}
            {t('legendCorrect')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-terracotta/30" />{' '}
            {t('legendOff')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-rose/20" />{' '}
            {t('legendMissing')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-ink/10" />{' '}
            {t('legendExtra')}
          </span>
          <span className="flex items-center gap-1 ml-1 pl-2 border-l border-ink/10">
            <SpeakerIcon micro /> {t('standard')} · <MicIcon micro />{' '}
            {t('myVoice')}
          </span>
        </div>

        {/* Phoneme cards */}
        <div className="flex flex-wrap gap-1.5">
          {alignment.map((item, i) => {
            const cardStyle = statusCardStyle(item.status)
            const isActive =
              activePlay?.kind === 'phoneme-me' && activePlay?.idx === i
            const hasTimestamp =
              item.start_ms != null && item.end_ms != null
            const acDot = acQualityColor(item.acoustic?.quality)

            return (
              <div
                key={i}
                className={`flex flex-col items-center rounded-lg border min-w-[3.25rem] transition-all duration-200 ${cardStyle} ${
                  isActive ? 'ring-2 ring-ink/30 scale-105 z-10' : ''
                }`}
              >
                {/* Phoneme display */}
                <div className="flex flex-col items-center px-2 pt-1.5 pb-1 relative">
                  <span className="text-[10px] font-mono opacity-50 leading-none">
                    {item.expected ?? '—'}
                  </span>
                  <span className="text-sm font-mono font-medium leading-tight">
                    {item.recognized ?? '—'}
                  </span>
                  {acDot && (
                    <span
                      className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${acDot}`}
                      title={
                        item.acoustic?.detail
                          ? `${item.acoustic.detail}`
                          : ''
                      }
                    />
                  )}
                </div>

                {/* Play buttons */}
                <div className="flex w-full border-t border-inherit">
                  <button
                    onClick={() =>
                      handlePhonemeStd(wordForAlignmentIndex[i])
                    }
                    disabled={!wordForAlignmentIndex[i]}
                    className="flex-1 flex items-center justify-center py-1 hover:bg-white/40 transition-colors rounded-bl-lg disabled:opacity-30"
                    title={
                      wordForAlignmentIndex[i]
                        ? `${t('standard')} — "${wordForAlignmentIndex[i]}"`
                        : undefined
                    }
                  >
                    <SpeakerIcon micro />
                  </button>
                  <button
                    onClick={() => handlePhonemeMe(i)}
                    disabled={!hasTimestamp || !trimmedUrl}
                    className="flex-1 flex items-center justify-center py-1 hover:bg-white/40 transition-colors rounded-br-lg border-l border-inherit disabled:opacity-30"
                    title={
                      hasTimestamp
                        ? `${t('myVoice')} (${item.start_ms}–${item.end_ms}ms)`
                        : undefined
                    }
                  >
                    <MicIcon micro />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom hint */}
        <p className="text-[11px] text-ink-muted/50 mt-4 leading-relaxed font-sans">
          {t('phonemeHint')}
          <br />
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald" />{' '}
            {t('acousticGood')}
          </span>
          {' · '}
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />{' '}
            {t('acousticOk')}
          </span>
          {' · '}
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose" />{' '}
            {t('acousticOff')}
          </span>
          {' · '}acoustic
        </p>
      </div>

      {/* ═══ Accent Tips ═══ */}
      {result.accent_tips.length > 0 && (
        <div className="card-surface p-6">
          <h3 className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest mb-4">
            {t('tips')}
          </h3>
          <div className="space-y-3">
            {result.accent_tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl border border-amber/15 bg-amber/[0.04]"
              >
                <span className="text-lg mt-0.5 shrink-0 select-none">
                  💡
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-mono font-medium bg-amber/15 text-amber-dark px-1.5 py-0.5 rounded">
                      {tip.pattern}
                    </span>
                    <span className="text-[10px] text-ink-muted/50 font-sans uppercase tracking-wide">
                      {t(frequencyLabel(tip.frequency))}
                    </span>
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed font-sans">
                    {tip.tip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──

function PlayPill({
  label,
  icon,
  active,
  onClick,
  variant,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  variant: 'emerald' | 'ink'
}) {
  const base =
    variant === 'emerald'
      ? 'text-emerald bg-emerald/[0.08] hover:bg-emerald/[0.15]'
      : 'text-ink-muted bg-ink/[0.06] hover:bg-ink/[0.12]'

  const activeCls =
    variant === 'emerald'
      ? 'bg-emerald text-white'
      : 'bg-ink text-white'

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-sans font-medium transition-all duration-200 ${
        active ? activeCls : base
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SpeakerIcon({ micro }: { micro?: boolean }) {
  const size = micro ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.47 4.47 0 0 0 2.5-3.5zM14 3.23v2.06a7.01 7.01 0 0 1 5 6.71 7 7 0 0 1-5 6.71v2.06a9 9 0 0 0 7-8.77 9 9 0 0 0-7-8.77z" />
    </svg>
  )
}

function MicIcon({ micro }: { micro?: boolean }) {
  const size = micro ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z" />
    </svg>
  )
}
