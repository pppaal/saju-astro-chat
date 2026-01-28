// Global type declarations for third-party analytics scripts
interface Window {
  gtag?: (...args: unknown[]) => void
  va?: (...args: unknown[]) => void
}
