interface Props {
onUnlock: () => void;
}
export default function PremiumPaywall({ onUnlock }: Props) {
return (
<div className="mt-8 text-center bg-gray-800/60 backdrop-blur-xl border-2 border-dashed border-blue-400/50 rounded-xl p-8 aura-fade-in">
<div className="text-yellow-400 mb-2">
<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 20 20" fill="currentColor">
<path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
</svg>
</div>
<h3 className="text-2xl font-bold text-white mb-2">Unlock Your Full Profile</h3>
<p className="text-gray-300 max-w-md mx-auto mb-6">Get the complete analysis of your strengths, challenges, career path, and more.</p>
<button onClick={onUnlock} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all transform hover:scale-105" >
Unlock Premium Profile for $4.99
</button>
<p className="text-xs text-gray-500 mt-3">(This is a one-time simulated purchase)</p>
</div>
);
}