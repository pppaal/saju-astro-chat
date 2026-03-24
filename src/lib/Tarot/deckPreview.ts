export function getDeckPreviewImagePath(backImage: string): string {
  return backImage
    .replace('/images/tarot/backs/', '/images/tarot/backs/previews/')
    .replace(/\.png$/i, '.webp')
}
