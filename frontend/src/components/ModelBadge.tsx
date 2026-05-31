import { useEffect, useState } from 'react'
import { getCurrentModel } from '../services/assess'
import type { CurrentModel, ModelInfo } from '../services/api'

export default function ModelBadge() {
  const [info, setInfo] = useState<CurrentModel | null>(null)

  useEffect(() => {
    getCurrentModel().then(setInfo).catch(() => {})
  }, [])

  if (!info) return null

  return (
    <span
      className="text-[10px] font-mono tracking-wide px-2 py-0.5 rounded-md bg-ink/5 text-ink-muted border border-ink/10"
      title={info.available.find((m: ModelInfo) => m.id === info.current)?.desc}
    >
      {info.current}
    </span>
  )
}
