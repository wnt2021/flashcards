import { useEffect, useState } from 'react';
import api from '../api/client';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EASE_BUCKETS = [
  { label: 'Struggling', color: 'bg-red-400' },
  { label: 'Hard',       color: 'bg-orange-400' },
  { label: 'Learning',   color: 'bg-yellow-400' },
  { label: 'Good',       color: 'bg-green-400' },
  { label: 'Very Good',  color: 'bg-brand-400' },
  { label: 'Mastered',   color: 'bg-brand-600' },
];

function heatColor(count) {
  if (!count)    return 'bg-gray-100 dark:bg-gray-800';
  if (count < 3) return 'bg-brand-200 dark:bg-brand-900';
  if (count < 6) return 'bg-brand-300 dark:bg-brand-700';
  if (count < 10) return 'bg-brand-400 dark:bg-brand-600';
  return 'bg-brand-500';
}

function buildWeeks(heatmapData) {
  const byDay = {};
  heatmapData.forEach(d => { byDay[d.day] = d.count; });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // align to Sunday

  const weeks = [];
  const cur = new Date(start);

  while (cur <= today) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      week.push({ date: key, count: cur > today ? -1 : (byDay[key] || 0), month: cur.getMonth() });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function Heatmap({ data }) {
  const weeks = buildWeeks(data);

  const monthLabels = weeks.map((week, wi) => {
    if (wi === 0) return MONTHS[week[0].month];
    if (week[0].month !== weeks[wi - 1][0].month) return MONTHS[week[0].month];
    return '';
  });

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: weeks.length * 14 }}>
        {/* Month labels */}
        <div className="flex mb-1 ml-5">
          {weeks.map((_, wi) => (
            <div key={wi} className="flex-shrink-0 text-xs text-gray-400" style={{ width: 12, marginRight: 2 }}>
              {monthLabels[wi] || ''}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="flex gap-0.5">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-0.5 mr-1 mt-0.5">
            {['', 'M', '', 'W', '', 'F', ''].map((label, i) => (
              <div key={i} className="text-xs text-gray-400 leading-none" style={{ height: 12, width: 10 }}>
                {label}
              </div>
            ))}
          </div>
          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={cell.count >= 0 ? `${cell.date}: ${cell.count} review${cell.count !== 1 ? 's' : ''}` : ''}
                  className={`rounded-sm flex-shrink-0 ${cell.count < 0 ? 'opacity-0' : heatColor(cell.count)}`}
                  style={{ width: 12, height: 12 }}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 justify-end">
          <span className="text-xs text-gray-400 mr-1">Less</span>
          {[0, 1, 3, 6, 10].map(n => (
            <div key={n} className={`rounded-sm ${heatColor(n)}`} style={{ width: 12, height: 12 }} />
          ))}
          <span className="text-xs text-gray-400 ml-1">More</span>
        </div>
      </div>
    </div>
  );
}

function EaseChart({ data }) {
  const byLabel = {};
  data.forEach(d => { byLabel[d.bucket] = d.count; });
  const counts = EASE_BUCKETS.map(b => ({ ...b, count: byLabel[b.label] || 0 }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="space-y-2.5">
      {counts.map(b => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right flex-shrink-0">{b.label}</span>
          <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${b.color} transition-all duration-700`}
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-7 text-right flex-shrink-0">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then(r => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <span className="text-4xl animate-spin">⚡</span>
    </div>
  );

  const { totalReviews, todayReviews, streak, overallRetention, heatmap, retention, weakest, easeDistrib } = stats;

  const overviewItems = [
    { label: 'Streak', value: streak, suffix: streak === 1 ? 'day' : 'days', icon: '🔥', color: 'text-orange-500' },
    { label: 'Total Reviews', value: totalReviews.toLocaleString(), icon: '✅', color: 'text-green-500' },
    { label: 'Today', value: todayReviews, icon: '📅', color: 'text-blue-500' },
    { label: 'Retention', value: `${overallRetention}%`, icon: '💯', color: 'text-brand-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">Analytics</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {overviewItems.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <span className="text-2xl">{s.icon}</span>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.label}{s.suffix ? <span className="ml-1 text-gray-300 dark:text-gray-600">· {s.suffix}</span> : null}
            </p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Study Activity</h2>
        {totalReviews === 0
          ? <p className="text-sm text-gray-400">No reviews yet — start studying to see your activity.</p>
          : <Heatmap data={heatmap} />
        }
      </div>

      {/* Retention + Weakest cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Retention per deck */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Retention by Deck</h2>
          {retention.length === 0
            ? <p className="text-sm text-gray-400">No review data yet.</p>
            : (
              <div className="space-y-4">
                {retention.map(d => {
                  const pct = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0;
                  const barColor = pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400';
                  const textColor = pct >= 80 ? 'text-green-500' : pct >= 60 ? 'text-yellow-500' : 'text-red-500';
                  return (
                    <div key={d.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[65%]">{d.name}</span>
                        <span className={`text-sm font-bold ${textColor}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{d.total} reviews · {d.good} correct</p>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Weakest cards */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Weakest Cards</h2>
          {weakest.length === 0
            ? <p className="text-sm text-gray-400">No reviewed cards yet.</p>
            : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {weakest.map(card => {
                  const ef = card.ease_factor.toFixed(2);
                  const efColor = card.ease_factor < 1.8 ? 'text-red-500' : card.ease_factor < 2.2 ? 'text-orange-500' : 'text-yellow-500';
                  return (
                    <div key={card.id} className="flex items-start gap-3 py-2.5">
                      <span className={`font-mono text-xs font-bold mt-0.5 w-9 flex-shrink-0 ${efColor}`}>{ef}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{card.front}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {card.deck_name}
                          {card.again_count > 0 && <span className="ml-2 text-red-400">· {card.again_count}× again</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Ease factor distribution */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Ease Factor Distribution</h2>
        <p className="text-xs text-gray-400 mb-4">How hard your reviewed cards are right now</p>
        {easeDistrib.length === 0
          ? <p className="text-sm text-gray-400">No reviewed cards yet.</p>
          : <EaseChart data={easeDistrib} />
        }
      </div>
    </div>
  );
}
