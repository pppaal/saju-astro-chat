'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export default function Breadcrumb({
  items,
  separator = '/',
  className = '',
}: BreadcrumbProps) {
  if (!items || items.length === 0) {return null;}

  return (
    <nav aria-label="Breadcrumb" className={`${styles.breadcrumb} ${className}`}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className={styles.item}>
              {!isLast && item.href ? (
                <Link
                  href={item.href}
                  className={styles.link}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && (
                    <span className={styles.icon} aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={`${styles.text} ${isLast ? styles.current : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && (
                    <span className={styles.icon} aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </span>
              )}

              {!isLast && (
                <span className={styles.separator} aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Convenience component for home breadcrumb
export function HomeBreadcrumb({ label = 'Home' }: { label?: string }) {
  return (
    <Breadcrumb
      items={[
        { label, href: '/', icon: '🏠' }
      ]}
    />
  );
}
