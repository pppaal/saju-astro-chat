//src/components/ui/BackButton.tsx

// BackButton is now a no-op. The global hamburger drawer (top-left on
// every page) already exposes the home link plus every service, and the
// browser back gesture still works. Returning null here lets us keep
// every existing import site without touching each page.

type BackButtonProps = {
  onClick?: () => void
  label?: string
  className?: string
}

export default function BackButton(_props: BackButtonProps) {
  return null
}
