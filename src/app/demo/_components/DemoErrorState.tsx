interface DemoErrorStateProps {
  message: string
}

export function DemoErrorState({ message }: DemoErrorStateProps) {
  return (
    <div
      style={{
        border: '1px solid #fecaca',
        borderRadius: 12,
        padding: 12,
        background: '#fef2f2',
        color: '#991b1b',
      }}
    >
      {message}
    </div>
  )
}
