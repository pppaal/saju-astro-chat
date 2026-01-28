import type { ReactNode, FC } from 'react';

const CardDesc: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="text-xs text-slate-400 mt-3 leading-relaxed p-2 bg-white/[0.03] rounded-md">
    {children}
  </p>
);

export default CardDesc;
