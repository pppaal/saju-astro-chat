// Reusable card component for compatibility insights

import { ReactNode, memo } from "react";

interface InsightCardProps {
  emoji?: string;
  title: string;
  colorTheme?: string;
  children: ReactNode;
  className?: string;
}

const colorMap: Record<string, { from: string; border: string; title: string; bg: string }> = {
  purple: {
    from: "from-slate-900/80 to-purple-900/20",
    border: "border-purple-500/30",
    title: "text-purple-300",
    bg: "bg-purple-500/10",
  },
  pink: {
    from: "from-slate-900/80 to-pink-900/20",
    border: "border-pink-500/30",
    title: "text-pink-300",
    bg: "bg-pink-500/10",
  },
  rose: {
    from: "from-slate-900/80 to-rose-900/20",
    border: "border-rose-500/30",
    title: "text-rose-300",
    bg: "bg-rose-500/10",
  },
  amber: {
    from: "from-slate-900/80 to-amber-900/20",
    border: "border-amber-500/30",
    title: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  emerald: {
    from: "from-slate-900/80 to-emerald-900/20",
    border: "border-emerald-500/30",
    title: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  cyan: {
    from: "from-slate-900/80 to-cyan-900/20",
    border: "border-cyan-500/30",
    title: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  blue: {
    from: "from-slate-900/80 to-blue-900/20",
    border: "border-blue-500/30",
    title: "text-blue-300",
    bg: "bg-blue-500/10",
  },
  indigo: {
    from: "from-slate-900/80 to-indigo-900/20",
    border: "border-indigo-500/30",
    title: "text-indigo-300",
    bg: "bg-indigo-500/10",
  },
  orange: {
    from: "from-slate-900/80 to-orange-900/20",
    border: "border-orange-500/30",
    title: "text-orange-300",
    bg: "bg-orange-500/10",
  },
  red: {
    from: "from-slate-900/80 to-red-900/20",
    border: "border-red-500/30",
    title: "text-red-300",
    bg: "bg-red-500/10",
  },
  green: {
    from: "from-slate-900/80 to-green-900/20",
    border: "border-green-500/30",
    title: "text-green-300",
    bg: "bg-green-500/10",
  },
  yellow: {
    from: "from-slate-900/80 to-yellow-900/20",
    border: "border-yellow-500/30",
    title: "text-yellow-300",
    bg: "bg-yellow-500/10",
  },
};

export const InsightCard = memo(function InsightCard({
  emoji,
  title,
  colorTheme = "purple",
  children,
  className = "",
}: InsightCardProps) {
  const colors = colorMap[colorTheme] || colorMap.purple;

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${colors.from} border ${colors.border} p-6 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        {emoji && <span className="text-2xl">{emoji}</span>}
        <h3 className={`text-lg font-bold ${colors.title}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
})

export const InsightContent = memo(function InsightContent({
  children,
  colorTheme = "purple",
  className = "",
}: {
  children: ReactNode;
  colorTheme?: string;
  className?: string;
}) {
  const colors = colorMap[colorTheme] || colorMap.purple;
  return (
    <div
      className={`p-4 rounded-xl ${colors.bg} border ${colors.border.replace("30", "20")} ${className}`}
    >
      {children}
    </div>
  );
})

export const ScoreBar = memo(function ScoreBar({
  label,
  score,
  colorTheme = "purple",
}: {
  label: string;
  score: number;
  colorTheme?: string;
}) {
  const colors = colorMap[colorTheme] || colorMap.purple;
  const barColor = score >= 80 ? "bg-emerald-500" :
    score >= 60 ? "bg-amber-500" :
    score >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className={colors.title}>{label}</span>
        <span className="text-gray-300">{score}점</span>
      </div>
      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
})

export const Badge = memo(function Badge({
  text,
  colorTheme = "purple",
  size = "md",
}: {
  text: string;
  colorTheme?: string;
  size?: "sm" | "md" | "lg";
}) {
  const colors = colorMap[colorTheme] || colorMap.purple;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" :
    size === "lg" ? "px-4 py-2 text-base" : "px-3 py-1 text-sm";

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full ${colors.bg} ${colors.border} border ${colors.title}`}>
      {text}
    </span>
  );
})

export default InsightCard;
