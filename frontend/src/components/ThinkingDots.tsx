import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function ThinkingDots() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dots = containerRef.current?.querySelectorAll('.thinking-dot')
    if (!dots) return

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.3 })
    tl.to(dots[0], { scale: 1.4, duration: 0.3, ease: 'power2.out' })
      .to(dots[0], { scale: 1, duration: 0.2 }, '+=0.1')
      .to(dots[1], { scale: 1.4, duration: 0.3, ease: 'power2.out' }, '-=0.2')
      .to(dots[1], { scale: 1, duration: 0.2 }, '+=0.1')
      .to(dots[2], { scale: 1.4, duration: 0.3, ease: 'power2.out' }, '-=0.2')
      .to(dots[2], { scale: 1, duration: 0.2 }, '+=0.1')

    return () => { tl.kill() }
  }, [])

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 py-2">
      <span className="thinking-dot w-2 h-2 rounded-full bg-amber inline-block" />
      <span className="thinking-dot w-2 h-2 rounded-full bg-amber inline-block" />
      <span className="thinking-dot w-2 h-2 rounded-full bg-amber inline-block" />
    </div>
  )
}
