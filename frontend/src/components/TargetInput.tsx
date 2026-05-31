interface Props {
  value: string
  onChange: (value: string) => void
}

export default function TargetInput({ value, onChange }: Props) {
  return (
    <div className="card">
      <div className="card-title">Target Sentence</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='Enter the sentence you want to practice, e.g. "Hello world"'
      />
    </div>
  )
}
