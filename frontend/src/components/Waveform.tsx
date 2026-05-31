const BAR_COUNT = 36

const heights = Array.from({ length: BAR_COUNT }, () => {
  const base = 6 + Math.random() * 28
  return Math.round(base)
})

export default function Waveform({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[2px] h-14 my-6 px-1">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-500 ${
            active
              ? 'bg-gradient-to-t from-terracotta to-amber animate-wave'
              : 'bg-ink/10'
          }`}
          style={{
            height: active ? undefined : `${Math.max(4, h * 0.35)}px`,
            '--wave-h': `${h}px`,
            animationDelay: active ? `${i * 0.025}s` : undefined,
            opacity: active ? undefined : 0.5,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
