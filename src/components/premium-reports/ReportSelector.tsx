'use client';

import Link from 'next/link';

export interface ReportType {
  id: string;
  title: string;
  description: string;
  emoji: string;
  credits: number | string;
  color: string;
  href: string;
  features?: string[];
}

interface ReportSelectorProps {
  reports: ReportType[];
}

export function ReportSelector({ reports }: ReportSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <Link
          key={report.id}
          href={report.href}
          className="group block"
        >
          <div className={`h-full p-6 rounded-2xl bg-gradient-to-br ${report.color} bg-opacity-10 border border-slate-700/50 hover:border-slate-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
            <div className="text-5xl mb-4">{report.emoji}</div>
            <h3 className="text-xl font-bold text-white mb-2">{report.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{report.description}</p>

            {report.features && (
              <ul className="space-y-1 mb-4">
                {report.features.map((feature, index) => (
                  <li key={index} className="text-gray-500 text-xs flex items-center gap-1">
                    <span className="text-purple-400">•</span> {feature}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
              <span className="text-purple-400 text-sm font-medium">
                ✦ {report.credits} 크레딧
              </span>
              <span className="text-gray-400 text-sm group-hover:text-white transition-colors">
                시작하기 →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
