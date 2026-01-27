/**
 * OptimizedImage Component - Usage Examples
 *
 * This file demonstrates how to use the OptimizedImage components
 * for various scenarios to improve performance.
 */

import { OptimizedImage, ResponsiveImage, AvatarImage } from './OptimizedImage';

// Example 1: Basic optimized image with lazy loading
export function BasicImageExample() {
  return (
    <OptimizedImage
      src="/images/hero.jpg"
      alt="Hero image"
      width={1200}
      height={600}
      blurPlaceholder={true}
    />
  );
}

// Example 2: Above-the-fold image with priority loading
export function HeroImageExample() {
  return (
    <OptimizedImage
      src="/images/hero-banner.jpg"
      alt="Welcome banner"
      width={1920}
      height={1080}
      priority={true}  // Loads immediately, no lazy loading
      blurPlaceholder={false}  // No blur needed for priority images
    />
  );
}

// Example 3: Responsive image with aspect ratio
export function CardImageExample() {
  return (
    <OptimizedImage
      src="/images/card-image.jpg"
      alt="Card thumbnail"
      width={400}
      height={300}
      aspectRatio="4/3"
      className="rounded-lg"
      containerClassName="shadow-lg"
    />
  );
}

// Example 4: Image with custom placeholder
export function CustomPlaceholderExample() {
  return (
    <OptimizedImage
      src="/images/profile.jpg"
      alt="Profile picture"
      width={200}
      height={200}
      placeholderSrc="/images/placeholder-avatar.jpg"
      blurPlaceholder={true}
    />
  );
}

// Example 5: Responsive image with different sources
export function ArtDirectionExample() {
  return (
    <ResponsiveImage
      src="/images/desktop-hero.jpg"
      mobileSrc="/images/mobile-hero.jpg"
      tabletSrc="/images/tablet-hero.jpg"
      desktopSrc="/images/desktop-hero-large.jpg"
      alt="Responsive hero image"
      width={1200}
      height={600}
      priority={true}
    />
  );
}

// Example 6: Avatar with fallback to initials
export function AvatarExample() {
  return (
    <AvatarImage
      src="/images/user-avatar.jpg"
      name="John Doe"
      size={48}
    />
  );
}

// Example 7: Avatar without image (shows initials)
export function AvatarFallbackExample() {
  return (
    <AvatarImage
      src=""
      name="Jane Smith"
      size={64}
    />
  );
}

// Example 8: Gallery of images with lazy loading
export function GalleryExample() {
  const images = [
    { src: '/gallery/1.jpg', alt: 'Gallery image 1' },
    { src: '/gallery/2.jpg', alt: 'Gallery image 2' },
    { src: '/gallery/3.jpg', alt: 'Gallery image 3' },
    { src: '/gallery/4.jpg', alt: 'Gallery image 4' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {images.map((img, index) => (
        <OptimizedImage
          key={index}
          src={img.src}
          alt={img.alt}
          width={300}
          height={300}
          aspectRatio="1/1"
          blurPlaceholder={true}
          className="hover:scale-105 transition-transform"
        />
      ))}
    </div>
  );
}

// Example 9: Dynamic image from user upload
export function DynamicImageExample({ imageUrl }: { imageUrl: string }) {
  return (
    <OptimizedImage
      src={imageUrl}
      alt="User uploaded image"
      width={800}
      height={600}
      blurPlaceholder={true}
      // Next.js Image requires domains to be configured in next.config.js
    />
  );
}

// Example 10: Image with Next.js sizes attribute for responsive loading
export function ResponsiveSizesExample() {
  return (
    <OptimizedImage
      src="/images/responsive.jpg"
      alt="Responsive image"
      width={1200}
      height={800}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      blurPlaceholder={true}
    />
  );
}

/**
 * Performance Best Practices:
 *
 * 1. Above-the-fold images: Use priority={true}, blurPlaceholder={false}
 * 2. Below-the-fold images: Use lazy loading (default)
 * 3. Fixed aspect ratio: Use aspectRatio prop to prevent layout shift
 * 4. Large images: Always specify sizes attribute for responsive loading
 * 5. Decorative images: Use alt="" with role="presentation"
 * 6. User avatars: Use AvatarImage component for fallback support
 * 7. Art direction: Use ResponsiveImage for different crops per breakpoint
 * 8. External images: Configure domains in next.config.js
 * 9. Image quality: Default 85 is optimized for web
 * 10. Format: Next.js auto-serves AVIF/WebP when supported
 */
