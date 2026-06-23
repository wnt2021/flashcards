import { useState } from 'react';

export default function FlipCard({ front, back, frontImage, backImage, onFlip }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    if (next && onFlip) onFlip();
  };

  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: '1000px', height: '340px' }}
      onClick={handleFlip}
    >
      <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div className="flip-card-front bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center p-8 gap-4">
          <span className="text-xs uppercase tracking-widest font-semibold text-brand-500 mb-2">Question</span>
          {frontImage && (
            <img src={`/uploads/${frontImage}`} alt="" className="max-h-32 rounded-xl object-contain" />
          )}
          <p className="text-xl font-medium text-center text-gray-800 dark:text-gray-100 leading-relaxed">{front}</p>
          <p className="text-xs text-gray-400 mt-4">Tap to reveal answer</p>
        </div>

        {/* Back */}
        <div className="flip-card-back bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 gap-4">
          <span className="text-xs uppercase tracking-widest font-semibold text-brand-100 mb-2">Answer</span>
          {backImage && (
            <img src={`/uploads/${backImage}`} alt="" className="max-h-32 rounded-xl object-contain" />
          )}
          <p className="text-xl font-medium text-center text-white leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  );
}
