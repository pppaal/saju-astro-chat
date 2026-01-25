'use client';

import React, { memo, useState, useRef } from 'react';
import Link from 'next/link';
import { SERVICE_LINKS, type ServiceKey } from '@/data/home';
import Card from '@/components/ui/Card';
import Grid from '@/components/ui/Grid';
import styles from '@/app/(main)/main-page.module.css';

interface ServicesGridProps {
  eyebrow: string;
  title: string;
  description: string;
  translate: (key: string, fallback: string) => string;
}

/**
 * Services grid section showing all available fortune-telling services
 * Memoized to prevent unnecessary re-renders
 */
export const ServicesGrid = memo(function ServicesGrid({
  eyebrow,
  title,
  description,
  translate,
}: ServicesGridProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Split services into 2 pages (7 per page for 14 total)
  const serviceEntries = Object.entries(SERVICE_LINKS);
  const servicesPerPage = 7;
  const totalPages = Math.ceil(serviceEntries.length / servicesPerPage);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex);
    if (scrollContainerRef.current) {
      const pageWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: pageWidth * pageIndex,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const pageWidth = scrollContainerRef.current.offsetWidth;
      const newPage = Math.round(scrollLeft / pageWidth);
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    }
  };

  return (
    <section className={styles.services}>
      <div className={styles.serviceHeader}>
        <div>
          <p className={styles.serviceEyebrow}>{eyebrow}</p>
          <h2 className={styles.serviceTitle}>{title}</h2>
          <p className={styles.serviceDesc}>{description}</p>
        </div>
      </div>

      <div className={styles.serviceScrollContainer}>
        <div
          ref={scrollContainerRef}
          className={styles.servicePages}
          onScroll={handleScroll}
        >
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const startIndex = pageIndex * servicesPerPage;
            const endIndex = startIndex + servicesPerPage;
            const pageServices = serviceEntries.slice(startIndex, endIndex);

            return (
              <div key={pageIndex} className={styles.servicePage}>
                <Grid columns={4} gap="1.5rem" className={styles.serviceGrid}>
                  {pageServices.map(([key, { href }]) => {
                    const serviceKey = key as ServiceKey;
                    return (
                      <Link
                        key={serviceKey}
                        href={href}
                        className={styles.serviceCardLink}
                        prefetch={false}
                      >
                        <Card className={styles.serviceCard}>
                          <div className={styles.serviceIconWrapper}>
                            <span className={styles.serviceIcon}>
                              {getServiceIcon(serviceKey)}
                            </span>
                          </div>
                          <h3 className={styles.serviceCardTitle}>
                            {translate(key, key)}
                          </h3>
                          <p className={styles.serviceCardDesc}>
                            {translate(`${key}Desc`, getServiceFallbackDesc(serviceKey))}
                          </p>
                        </Card>
                      </Link>
                    );
                  })}
                </Grid>
              </div>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {currentPage > 0 && (
          <button
            className={`${styles.serviceNavButton} ${styles.serviceNavLeft}`}
            onClick={() => handlePageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
        )}
        {currentPage < totalPages - 1 && (
          <button
            className={`${styles.serviceNavButton} ${styles.serviceNavRight}`}
            onClick={() => handlePageChange(currentPage + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        )}
      </div>

      {/* Page indicators */}
      <div className={styles.servicePageIndicators}>
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            className={`${styles.servicePageDot} ${index === currentPage ? styles.active : ''}`}
            onClick={() => handlePageChange(index)}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
});

// Helper function to get service icon
function getServiceIcon(key: ServiceKey): string {
  const icons: Record<ServiceKey, string> = {
    destinyMap: '🗺️',
    saju: '☯️',
    astrology: '✨',
    tarot: '🔮',
    iching: '📜',
    dream: '🌙',
    numerology: '🔢',
    compatibility: '💕',
    calendar: '📅',
    personality: '🌈',
    icp: '🎭',
    pastLife: '🔄',
    aiReports: "🤖",
    lifePrediction: "🔮",
  };
  return icons[key] || '✨';
}

// Helper function to get fallback descriptions
function getServiceFallbackDesc(key: ServiceKey): string {
  const descriptions: Record<ServiceKey, string> = {
    destinyMap: 'Visualize your life path',
    saju: 'Korean Four Pillars reading',
    astrology: 'Western astrological insights',
    tarot: 'Divine card reading',
    iching: 'Ancient Chinese oracle',
    dream: 'Dream interpretation',
    numerology: 'Numbers reveal destiny',
    compatibility: 'Relationship analysis',
    calendar: 'Fortune calendar',
    personality: 'Personality insights',
    icp: 'Relationship style',
    pastLife: 'Past life regression',
    aiReports: "AI-powered reports",
    lifePrediction: "Life predictions",
  };
  return descriptions[key] || 'Discover your destiny';
}

export default ServicesGrid;
