interface DemoErrorStateProps {
  message: unknown
}

import styles from './demo-ui.module.css'

function toDisplayText(message: unknown): string {
  if (message instanceof Error) {
    return message.message
  }
  if (typeof message === 'string') {
    return message
  }
  try {
    return JSON.stringify(message, null, 2)
  } catch {
    return String(message)
  }
}

export function DemoErrorState({ message }: DemoErrorStateProps) {
  const text = toDisplayText(message)
  return (
    <div className={styles.errorBox}>
      <h3 className={styles.errorTitle}>Request Failed</h3>
      <p className={styles.errorText}>{text}</p>
    </div>
  )
}
