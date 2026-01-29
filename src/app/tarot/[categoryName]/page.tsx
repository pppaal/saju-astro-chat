import { redirect } from 'next/navigation';

/**
 * Redirect handler for /tarot/[categoryName]
 * This route exists only as a parent for /tarot/[categoryName]/[spreadId]
 * Users accessing this route directly should be redirected to the main tarot page
 */
export default function TarotCategoryPage() {
  redirect('/tarot');
}
