/**
 * Section Builder Utilities
 * Standardized section formatting for destiny map prompts
 */

/**
 * Standard section separator line
 */
const SEPARATOR = "═══════════════════════════════════════════════════════════════";

/**
 * Create a formatted section header with separator lines
 * @param titleKo - Korean title
 * @param titleEn - English title
 * @param lang - Language ('ko' or 'en')
 * @returns Formatted section header with separators
 */
export function createSectionHeader(
  titleKo: string,
  titleEn: string,
  lang: string
): string {
  const title = lang === "ko" ? titleKo : titleEn;
  return `${SEPARATOR}\n${title}\n${SEPARATOR}`;
}

/**
 * Create a simple section divider
 * @returns Section separator line
 */
export function createSectionDivider(): string {
  return SEPARATOR;
}

/**
 * Wrap content with section headers
 * @param titleKo - Korean title
 * @param titleEn - English title
 * @param lang - Language
 * @param content - Content to wrap
 * @returns Formatted section with header and content
 */
export function wrapInSection(
  titleKo: string,
  titleEn: string,
  lang: string,
  content: string
): string {
  return `\n${createSectionHeader(titleKo, titleEn, lang)}\n${content}\n`;
}

/**
 * Create a subsection title
 * @param titleKo - Korean title
 * @param titleEn - English title
 * @param lang - Language
 * @returns Formatted subsection title
 */
export function createSubsectionTitle(
  titleKo: string,
  titleEn: string,
  lang: string
): string {
  const title = lang === "ko" ? titleKo : titleEn;
  return `--- ${title} ---`;
}
