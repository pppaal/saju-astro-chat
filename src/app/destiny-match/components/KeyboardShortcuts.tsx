import { useState } from 'react'

type CSSStyles = { readonly [key: string]: string }

interface KeyboardShortcutsProps {
  styles: CSSStyles
}

export function KeyboardShortcuts({ styles }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const shortcuts = [
    { key: '←', action: 'Pass' },
    { key: '→', action: 'Like' },
    { key: '↑', action: 'Super Like' },
    { key: 'I', action: 'View Info' },
    { key: 'Ctrl/⌘ + Z', action: 'Undo' },
  ]

  return (
    <div className={styles.keyboardShortcuts}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.shortcutsToggle}
        title="Keyboard shortcuts"
        aria-label="Toggle keyboard shortcuts"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">⌨️</span>
      </button>

      {isOpen && (
        <div className={styles.shortcutsPanel}>
          <div className={styles.shortcutsPanelHeader}>
            <h3 className={styles.shortcutsPanelTitle}>Keyboard Shortcuts</h3>
            <button
              onClick={() => setIsOpen(false)}
              className={styles.shortcutsPanelClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <ul className={styles.shortcutsList}>
            {shortcuts.map(({ key, action }) => (
              <li key={key} className={styles.shortcutsItem}>
                <kbd className={styles.shortcutsKey}>{key}</kbd>
                <span className={styles.shortcutsAction}>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
