import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function DashboardPage() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/decks').then(r => { setDecks(r.data); setLoading(false); });
  }, []);

  const totalCards = decks.reduce((s, d) => s + (d.card_count || 0), 0);
  const totalDue = decks.reduce((s, d) => s + (d.due_count || 0), 0);
  const dueDecks = decks.filter(d => d.due_count > 0);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><span className="text-4xl animate-spin">⚡</span></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Good {getGreeting()} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your study overview for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Decks', value: decks.length, icon: '📚', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600' },
          { label: 'Total Cards', value: totalCards, icon: '🃏', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
          { label: 'Due Today', value: totalDue, icon: '🔥', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Due now */}
      {dueDecks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">Ready to review</h2>
          <div className="space-y-3">
            {dueDecks.map(deck => (
              <Link key={deck.id} to={`/study/${deck.id}`}
                className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: deck.color + '22' }}>
                    📖
                  </span>
                  <div>
                    <p className="font-semibold">{deck.name}</p>
                    <p className="text-xs text-gray-400">{deck.due_count} cards due</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-brand-500 text-white text-xs font-semibold rounded-full group-hover:bg-brand-600 transition-colors">
                  Study →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {decks.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <span className="text-5xl">📭</span>
          <p className="text-gray-500 dark:text-gray-400 mt-4 font-medium">No decks yet</p>
          <Link to="/decks" className="mt-4 inline-block px-6 py-2.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors text-sm">
            Create your first deck
          </Link>
        </div>
      )}

      {totalDue === 0 && decks.length > 0 && (
        <div className="text-center py-10 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
          <span className="text-4xl">🎉</span>
          <p className="text-green-700 dark:text-green-400 font-semibold mt-3">You're all caught up!</p>
          <p className="text-green-600 dark:text-green-500 text-sm mt-1">No cards due right now. Check back later.</p>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
