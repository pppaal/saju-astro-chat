import React from 'react';

interface Props {
title: string;
children: React.ReactNode;
icon: React.ReactNode;
}

export default function ResultSection({ title, children, icon }: Props) {
return (
<div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/60 rounded-xl p-6 shadow-lg">
<div className="flex items-center mb-3">
<div className="text-blue-400 mr-3">{icon}</div>
<h3 className="text-xl font-bold text-white">{title}</h3>
</div>
<div className="text-gray-300 space-y-2 leading-relaxed">{children}</div>
</div>
);
}