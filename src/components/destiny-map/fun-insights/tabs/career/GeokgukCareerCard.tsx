interface GeokgukCareerCardProps {
  geokCareer: { title: string; desc: string; emoji: string };
}

export default function GeokgukCareerCard({ geokCareer }: GeokgukCareerCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-blue-900/20 border border-blue-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{geokCareer.emoji}</span>
        <h3 className="text-lg font-bold text-blue-300">{geokCareer.title}</h3>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed">{geokCareer.desc}</p>
    </div>
  );
}
