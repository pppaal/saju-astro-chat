'use client';
import Link from 'next/link';
import AuraRingVisual from '@/components/aura/AuraRingVisual';

export default function PersonalityHomePage() {
  const defaultColors = ['hsl(220, 90%, 65%)', 'hsl(300, 90%, 65%)', 'hsl(180, 90%, 65%)'];

  return (
    <>
      <AuraRingVisual colors={defaultColors} />
      <main className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 z-10">
        <div className="aura-fade-in">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight">
            Discover Your True Aura
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-gray-300 mb-8">
            A next-generation personality test to reveal your unique energy, core motivations, and hidden potential.
          </p>
          <Link
            href="/personality/quiz"
            className="bg-white text-gray-900 font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-200 transition-all transform hover:scale-105 shadow-2xl shadow-white/10"
          >
            Start the Free Discovery Test
          </Link>
        </div>
      </main>
    </>
  );
}