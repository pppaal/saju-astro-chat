import type { ReactNode, FC } from 'react';

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="mb-12" aria-labelledby={`section-${title.replace(/\s/g, '-')}`}>
    <h2
      id={`section-${title.replace(/\s/g, '-')}`}
      className="text-lg font-medium border-b border-slate-600 pb-3 mb-6 text-gray-400"
    >
      {title}
    </h2>
    {children}
  </section>
);

export default Section;
