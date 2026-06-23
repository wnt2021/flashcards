import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import FlipCard from '../components/ui/FlipCard';

const RATINGS = [
  { quality: 0, label: 'Again', desc: '<1 min', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' },
  { quality: 1, label: 'Hard', desc: '~1 day', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200' },
  { quality: 3, label: 'Good', desc: '~3 days', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200' },
  { quality: 4, label: 'Easy', desc: '~1 week', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200' },
];

export default function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicParam = searchParams.get('topic');
  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    const dueUrl = topicParam ? `/cards/deck/${id}/due?topic=${topicParam}` : `/cards/deck/${id}/due`;
    Promise.all([api.get(`/decks/${id}`), api.get(dueUrl)])
      .then(([d, c]) => { setDeck(d.data); setQueue(c.data); setLoading(false); if (c.data.length === 0) setDone(true); });
  }, [id]);

  const card = queue[index];
  const progress = queue.length > 0 ? (index / queue.length) * 100 : 100;

  const rate = async quality => {
    await api.post(`/cards/${card.id}/review`, { quality });
    const label = RATINGS.find(r => r.quality === quality)?.label.toLowerCase();
    setSessionStats(s => ({ ...s, [label]: s[label] + 1 }));

    if (quality === 0) {
      setQueue(q => [...q, card]);
    }

    if (index + 1 >= queue.length && quality !== 0) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setRevealed(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><span className="text-4xl animate-spin">⚡</span></div>;

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <span className="text-6xl">🎉</span>
        <h1 className="text-2xl font-bold mt-4">Session complete!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Great work on <strong>{deck?.name}</strong></p>

        <div className="grid grid-cols-4 gap-3 mt-8">
          {[
            { label: 'Again', value: sessionStats.again, color: 'text-red-500' },
            { label: 'Hard', value: sessionStats.hard, color: 'text-orange-500' },
            { label: 'Good', value: sessionStats.good, color: 'text-green-500' },
            { label: 'Easy', value: sessionStats.easy, color: 'text-blue-500' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          <Link to={`/decks/${id}`} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
            Back to Deck
          </Link>
          <Link to="/" className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors text-sm">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-80px)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/decks/${id}`)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">✕</button>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{deck?.name}</p>
          <p className="text-xs text-gray-400">{index + 1} / {queue.length} cards</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="flex-1">
          <FlipCard
            front={card?.front}
            back={card?.back}
            frontImage={card?.front_image}
            backImage={card?.back_image}
            onFlip={() => setRevealed(true)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Rating buttons */}
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <p className="text-xs text-center text-gray-400 mb-3">How well did you know this?</p>
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map(r => (
                <button key={r.quality} onClick={() => rate(r.quality)}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all ${r.color}`}>
                  <div>{r.label}</div>
                  <div className="text-xs font-normal opacity-70 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
