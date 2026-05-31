const BAR_COUNT = 28

const heights = Array.from({ length: BAR_COUNT }, () => {
  // Generate varied heights for a natural waveform look
  const base = 8 + Math.random() * 28
  return Math.round(base)
})

export default function Waveform({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-12 my-6">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            active ? 'bg-red-400/60 animate-wave-bar' : 'bg-gray-200'
          }`}
          style={{
            height: active ? undefined : `${h * 0.5}px`,
            '--h': `${h}px`,
            animationDelay: active ? `${i * 0.03}s` : undefined,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
