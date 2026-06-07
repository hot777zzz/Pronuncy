import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface Props {
  score: number
  size?: 'sm' | 'lg'
  label?: string
  animate?: boolean
}

export default function AnimatedScore({ score, size = 'lg', label, animate = true }: Props) {
  const ringRef = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)

  const isLarge = size === 'lg'
  const dims = isLarge ? 'w-28 h-28' : 'w-20 h-20'
  const textSize = isLarge ? 'text-4xl' : 'text-2xl'

  const colorClass = score >= 80
    ? 'text-emerald border-emerald'
    : score >= 50
      ? 'text-terracotta border-terracotta'
      : 'text-rose border-rose'

  const bgClass = score >= 80
    ? 'border-emerald/20 bg-emerald/[0.06]'
    : score >= 50
      ? 'border-terracotta/20 bg-terracotta/[0.06]'
      : 'border-rose/20 bg-rose/[0.06]'

  useEffect(() => {
    if (!animate || !numRef.current || !ringRef.current) return

    const target = { val: 0 }
    gsap.to(target, {
      val: score,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = Math.round(target.val).toString()
        }
      },
    })

    gsap.fromTo(ringRef.current,
      { scale: 0.5, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' },
    )
  }, [score, animate])

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ringRef}
        className={`${dims} rounded-full border-[3px] flex items-center justify-center ${bgClass} ${colorClass}`}
      >
        <span ref={numRef} className={`${textSize} font-display font-bold italic ${colorClass}`}>
          {animate ? 0 : score}
        </span>
      </div>
      {label && (
        <span className="text-[11px] font-sans font-semibold text-ink-muted uppercase tracking-widest">
          {label}
        </span>
      )}
    </div>
  )
}
