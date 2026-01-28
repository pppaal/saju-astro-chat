import type { FC } from 'react';

const CardRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 text-sm">
    <span className="text-gray-400 mr-2">{label}:</span>
    <span className="text-gray-200 font-medium">{value}</span>
  </div>
);

export default CardRow;
