import { LUMINANCE_WEIGHTS } from '@/lib/constants/formulas'

export type ContrastLevel = 'AA' | 'AAA'
export type TextSize = 'normal' | 'large'

export type HeadingInfo = {
  level: number
  text: string
}

export type ContrastResult = {
  ratio: number
  passesAA: boolean
  passesAAA: boolean
  minRequired: number
  passes: boolean
  foreground: string
  background: string
  level: ContrastLevel
  size: TextSize
}

export type AccessibilityReport = {
  score: number
  contrast: {
    checked: boolean
    results: ContrastResult[]
  }
  aria: {
    checked: number
    validRoles: boolean
    invalidRoles: string[]
    missingAttributes: string[]
    invalidAttributes: string[]
  }
  altText: {
    checked: number
    valid: number
    invalid: { alt?: string; reason: string }[]
  }
  headings: {
    checked: boolean
    valid: boolean
    errors: string[]
  }
  keyboard: {
    checked: number
    accessible: number
    inaccessible: number
  }
  touchTargets: {
    checked: number
    valid: number
    invalid: number
    issues: { width: number; height: number; recommendation?: string }[]
  }
}

export type AccessibilityInput = {
  colors?: Array<{
    foreground: string
    background: string
    level?: ContrastLevel
    size?: TextSize
  }>
  ariaElements?: Array<{
    role: string
    attributes: Record<string, string>
  }>
  images?: Array<{
    alt?: string
  }>
  headings?: HeadingInfo[]
  interactiveElements?: Array<{
    tabIndex?: number
    role?: string
    disabled?: boolean
  }>
  touchTargets?: Array<{
    width: number
    height: number
  }>
}

const VALID_ARIA_ROLES = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
])

const REQUIRED_ARIA_ATTRIBUTES: Record<string, string[]> = {
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded', 'aria-controls'],
  slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
}

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'menu',
  'menuitem',
  'tab',
])

const ALT_TEXT_BANNED = new Set(['image', 'img', 'picture', 'photo', 'graphic', 'icon'])

function normalizeHex(color: string) {
  const hex = color.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error('Invalid hex color format')
  }
  return hex.toLowerCase()
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

function channelToLinear(channel: number) {
  const value = channel / 255
  if (value <= 0.03928) {
    return value / 12.92
  }
  return Math.pow((value + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const red = channelToLinear(r)
  const green = channelToLinear(g)
  const blue = channelToLinear(b);
  return (
    LUMINANCE_WEIGHTS.RED * red + LUMINANCE_WEIGHTS.GREEN * green + LUMINANCE_WEIGHTS.BLUE * blue
  )
}

export function getContrastRatio(foreground: string, background: string) {
  const fg = normalizeHex(foreground)
  const bg = normalizeHex(background)
  const lum1 = relativeLuminance(fg)
  const lum2 = relativeLuminance(bg)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100
}

export function checkContrast(
  foreground: string,
  background: string,
  level: ContrastLevel = 'AA',
  size: TextSize = 'normal'
) {
  const ratio = getContrastRatio(foreground, background)
  const aaMin = size === 'large' ? 3 : 4.5
  const aaaMin = size === 'large' ? 4.5 : 7

  const passesAA = ratio >= aaMin
  const passesAAA = ratio >= aaaMin
  const minRequired = level === 'AAA' ? aaaMin : aaMin

  return {
    ratio,
    passesAA,
    passesAAA,
    minRequired,
  }
}

export function isValidAriaRole(role: string) {
  return VALID_ARIA_ROLES.has(role)
}

export function validateAriaAttributes(role: string, attributes: Record<string, string> = {}) {
  const required = REQUIRED_ARIA_ATTRIBUTES[role] ?? []
  const missing = required.filter((attr) => !(attr in attributes))
  const invalid = Object.keys(attributes).filter(
    (attr) => !attr.startsWith('aria-') && attr !== 'role'
  );
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  }
}

export function isValidAltText(alt?: string) {
  if (alt === undefined || alt === null) {
    return { valid: false, reason: 'Alt text is missing' }
  }

  const trimmed = alt.trim()
  if (trimmed.length === 0) {
    return { valid: true }
  }

  if (trimmed.length > 125) {
    return { valid: false, reason: 'Alt text is too long' }
  }

  const lower = trimmed.toLowerCase()
  if (ALT_TEXT_BANNED.has(lower)) {
    return { valid: false, reason: 'Alt text is not descriptive' }
  }

  if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(lower)) {
    return { valid: false, reason: 'Alt text is not descriptive' }
  }

  return { valid: true }
}

export function validateHeadingStructure(headings: HeadingInfo[]) {
  const errors: string[] = []
  if (headings.length === 0) {
    return { valid: true, errors }
  }

  if (headings[0].level !== 1) {
    errors.push('Document should start with an h1')
  }

  let previousLevel = headings[0].level

  headings.forEach((heading, index) => {
    if (!heading.text || heading.text.trim().length === 0) {
      errors.push(`Heading at index ${index} is empty`)
    }

    if (index > 0 && heading.level - previousLevel > 1) {
      errors.push(`Heading level skips level from h${previousLevel} to h${heading.level}`)
    }
    previousLevel = heading.level
  });

  return { valid: errors.length === 0, errors }
}

export function isKeyboardAccessible(element: {
  tabIndex?: number
  role?: string
  disabled?: boolean
}) {
  if (element.disabled) {
    return false
  }

  if (typeof element.tabIndex === 'number') {
    return element.tabIndex >= 0
  }

  if (element.role && INTERACTIVE_ROLES.has(element.role)) {
    return true
  }

  return false
}

export function isValidTouchTarget(width: number, height: number) {
  const minSize = 44
  if (width >= minSize && height >= minSize) {
    return { valid: true }
  }
  return {
    valid: false,
    recommendation: `Increase to at least ${minSize}x${minSize} (current: ${width}x${height})`,
  }
}

export function generateAccessibilityReport(input: AccessibilityInput = {}): AccessibilityReport {
  const colors = input.colors ?? []
  const ariaElements = input.ariaElements ?? []
  const images = input.images ?? []
  const headings = input.headings
  const interactiveElements = input.interactiveElements ?? []
  const touchTargets = input.touchTargets ?? []

  const contrastResults: ContrastResult[] = colors.map((pair) => {
    const level = pair.level ?? 'AA'
    const size = pair.size ?? 'normal'
    const contrast = checkContrast(pair.foreground, pair.background, level, size)
    const passes = level === 'AAA' ? contrast.passesAAA : contrast.passesAA
    return {
      ...contrast,
      passes,
      foreground: pair.foreground,
      background: pair.background,
      level,
      size,
    }
  })

  const ariaMissing: string[] = []
  const ariaInvalid: string[] = []
  const invalidRoles: string[] = []
  let ariaPasses = 0

  ariaElements.forEach((element) => {
    const roleValid = isValidAriaRole(element.role)
    if (!roleValid) {
      invalidRoles.push(element.role)
    }
    const attrResult = validateAriaAttributes(element.role, element.attributes ?? {})
    ariaMissing.push(...attrResult.missing)
    ariaInvalid.push(...attrResult.invalid)
    if (roleValid && attrResult.valid) {
      ariaPasses += 1
    }
  })

  const altInvalid: { alt?: string; reason: string }[] = []
  let altPasses = 0
  images.forEach((image) => {
    const result = isValidAltText(image.alt)
    if (result.valid) {
      altPasses += 1
    } else {
      altInvalid.push({ alt: image.alt, reason: result.reason ?? 'Invalid alt text' })
    }
  })

  const headingsChecked = Array.isArray(headings)
  const headingResult = headingsChecked
    ? validateHeadingStructure(headings ?? [])
    : { valid: true, errors: [] }

  const keyboardChecked = interactiveElements.length
  const keyboardAccessible = interactiveElements.filter(isKeyboardAccessible).length
  const keyboardInaccessible = keyboardChecked - keyboardAccessible

  const touchIssues: { width: number; height: number; recommendation?: string }[] = []
  let touchValid = 0
  touchTargets.forEach((target) => {
    const result = isValidTouchTarget(target.width, target.height)
    if (result.valid) {
      touchValid += 1
    } else {
      touchIssues.push({
        width: target.width,
        height: target.height,
        recommendation: result.recommendation,
      })
    }
  })

  const totalChecks =
    contrastResults.length +
    ariaElements.length +
    images.length +
    (headingsChecked ? 1 : 0) +
    keyboardChecked +
    touchTargets.length
  const passedChecks =
    contrastResults.filter((result) => result.passes).length +
    ariaPasses +
    altPasses +
    (headingsChecked ? (headingResult.valid ? 1 : 0) : 0) +
    keyboardAccessible +
    touchValid
  const score = totalChecks === 0 ? 100 : Math.round((passedChecks / totalChecks) * 100);

  return {
    score,
    contrast: {
      checked: contrastResults.length > 0,
      results: contrastResults,
    },
    aria: {
      checked: ariaElements.length,
      validRoles: invalidRoles.length === 0,
      invalidRoles,
      missingAttributes: ariaMissing,
      invalidAttributes: ariaInvalid,
    },
    altText: {
      checked: images.length,
      valid: altPasses,
      invalid: altInvalid,
    },
    headings: {
      checked: headingsChecked,
      valid: headingResult.valid,
      errors: headingResult.errors,
    },
    keyboard: {
      checked: keyboardChecked,
      accessible: keyboardAccessible,
      inaccessible: keyboardInaccessible,
    },
    touchTargets: {
      checked: touchTargets.length,
      valid: touchValid,
      invalid: touchTargets.length - touchValid,
      issues: touchIssues,
    },
  }
}

export const Accessibility = {
  getContrastRatio,
  checkContrast,
  isValidAriaRole,
  validateAriaAttributes,
  isValidAltText,
  validateHeadingStructure,
  isKeyboardAccessible,
  isValidTouchTarget,
  generateAccessibilityReport,
}
