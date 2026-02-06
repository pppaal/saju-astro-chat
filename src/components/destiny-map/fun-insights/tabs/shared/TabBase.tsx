"use client";

/**
 * Tab Base Components
 * Shared components and utilities for all tab components
 * Eliminates duplicate UI patterns across 8+ tab files
 */

import { memo, type ReactNode } from 'react';

// ============ Section Components ============

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

/**
 * Standard section wrapper with title
 * Replaces repeated section patterns in tabs
 */
export const Section = memo(function Section({ title, children, className = '', icon }: SectionProps) {
  return (
    <section className={`rounded-lg bg-gray-800/50 p-4 border border-gray-700 ${className}`}>
      <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
});

interface SubSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Sub-section within a section
 */
export const SubSection = memo(function SubSection({ title, children, className = '' }: SubSectionProps) {
  return (
    <div className={`mt-4 ${className}`}>
      {title && <h4 className="text-sm font-medium text-gray-300 mb-2">{title}</h4>}
      {children}
    </div>
  );
});

// ============ Loading States ============

interface LoadingProps {
  message?: string;
}

/**
 * Loading state for tabs
 */
export const TabLoading = memo(function TabLoading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="text-gray-400 text-center p-6 animate-pulse">
      {message}
    </div>
  );
});

/**
 * Empty state for tabs
 */
export const TabEmpty = memo(function TabEmpty({ message = 'No data available' }: LoadingProps) {
  return (
    <div className="text-gray-400 text-center p-6">
      {message}
    </div>
  );
});

// ============ Info Display Components ============

interface InfoRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/**
 * Single row of label-value pair
 */
export const InfoRow = memo(function InfoRow({ label, value, className = '' }: InfoRowProps) {
  return (
    <div className={`flex justify-between items-center py-1 ${className}`}>
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
});

interface InfoGridProps {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Grid of info items
 */
export const InfoGrid = memo(function InfoGrid({ items, columns = 2, className = '' }: InfoGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="text-center p-2 bg-gray-700/50 rounded">
          <div className="text-gray-400 text-sm">{item.label}</div>
          <div className="text-white font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
});

// ============ Score Display Components ============

interface ScoreBarProps {
  score: number;
  maxScore?: number;
  label?: string;
  showLabel?: boolean;
  colorClass?: string;
}

/**
 * Score bar visualization
 */
export const ScoreBar = memo(function ScoreBar({
  score,
  maxScore = 100,
  label,
  showLabel = true,
  colorClass = 'bg-purple-500',
}: ScoreBarProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className="w-full">
      {showLabel && label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">{label}</span>
          <span className="text-white">{score}/{maxScore}</span>
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

interface GradeDisplayProps {
  grade: string;
  score?: number;
  className?: string;
}

/**
 * Grade badge display (S, A, B, C, D, F)
 */
export const GradeBadge = memo(function GradeBadge({ grade, score, className = '' }: GradeDisplayProps) {
  const gradeColors: Record<string, string> = {
    S: 'bg-yellow-500 text-black',
    A: 'bg-green-500 text-white',
    B: 'bg-blue-500 text-white',
    C: 'bg-purple-500 text-white',
    D: 'bg-orange-500 text-white',
    F: 'bg-red-500 text-white',
  };

  const colorClass = gradeColors[grade.toUpperCase()] ?? 'bg-gray-500 text-white';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`px-3 py-1 rounded-full font-bold text-lg ${colorClass}`}>
        {grade}
      </span>
      {score !== undefined && (
        <span className="text-gray-300 text-sm">{score}점</span>
      )}
    </div>
  );
});

// ============ Tag Components ============

interface TagProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

/**
 * Tag/chip component
 */
export const Tag = memo(function Tag({ children, variant = 'default', className = '' }: TagProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-700 text-gray-200',
    success: 'bg-green-900/50 text-green-300',
    warning: 'bg-yellow-900/50 text-yellow-300',
    danger: 'bg-red-900/50 text-red-300',
    info: 'bg-blue-900/50 text-blue-300',
  };

  return (
    <span className={`px-2 py-1 rounded text-sm ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
});

interface TagListProps {
  tags: string[];
  variant?: TagProps['variant'];
  className?: string;
}

/**
 * List of tags
 */
export const TagList = memo(function TagList({ tags, variant = 'default', className = '' }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag, index) => (
        <Tag key={index} variant={variant}>
          {tag}
        </Tag>
      ))}
    </div>
  );
});

// ============ Card Components ============

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Basic card component
 */
export const Card = memo(function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-lg bg-gray-800/50 p-4 border border-gray-700 ${onClick ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

interface InsightCardProps {
  title: string;
  description: string;
  score?: number;
  grade?: string;
  tags?: string[];
  icon?: ReactNode;
}

/**
 * Card for displaying insights
 */
export const InsightCard = memo(function InsightCard({
  title,
  description,
  score,
  grade,
  tags,
  icon,
}: InsightCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        {icon && <div className="text-purple-400 mt-1">{icon}</div>}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-white">{title}</h4>
            {grade && <GradeBadge grade={grade} score={score} />}
          </div>
          <p className="text-gray-300 text-sm">{description}</p>
          {tags && <TagList tags={tags} className="mt-2" />}
        </div>
      </div>
    </Card>
  );
});
