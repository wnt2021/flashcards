const express = require('express');
const db = require('../db');

const router = express.Router();

function getStreak() {
  const days = db.prepare(
    "SELECT DISTINCT date(reviewed_at) as day FROM review_logs ORDER BY day DESC"
  ).all().map(r => r.day);
  if (!days.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const a = new Date(days[i - 1]);
    const b = new Date(days[i]);
    if ((a - b) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

router.get('/', (req, res) => {
  const totalReviews = db.prepare('SELECT COUNT(*) as n FROM review_logs').get().n;
  const todayReviews = db.prepare(
    "SELECT COUNT(*) as n FROM review_logs WHERE date(reviewed_at) = date('now')"
  ).get().n;
  const goodReviews = db.prepare(
    'SELECT COUNT(*) as n FROM review_logs WHERE quality >= 3'
  ).get().n;
  const overallRetention = totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 0;
  const streak = getStreak();

  const heatmap = db.prepare(
    "SELECT date(reviewed_at) as day, COUNT(*) as count FROM review_logs WHERE reviewed_at >= datetime('now', '-365 days') GROUP BY day ORDER BY day"
  ).all();

  const retention = db.prepare(`
    SELECT d.id, d.name, d.color,
      COUNT(*) as total,
      SUM(CASE WHEN rl.quality >= 3 THEN 1 ELSE 0 END) as good
    FROM review_logs rl
    JOIN cards c ON c.id = rl.card_id
    JOIN decks d ON d.id = c.deck_id
    GROUP BY d.id
    ORDER BY d.name
  `).all();

  const weakest = db.prepare(`
    SELECT c.id, c.front, c.ease_factor, c.interval,
      d.name as deck_name,
      (SELECT COUNT(*) FROM review_logs rl WHERE rl.card_id = c.id AND rl.quality = 0) as again_count
    FROM cards c
    JOIN decks d ON d.id = c.deck_id
    WHERE c.repetitions > 0
    ORDER BY c.ease_factor ASC, again_count DESC
    LIMIT 10
  `).all();

  const easeDistrib = db.prepare(`
    SELECT
      CASE
        WHEN ease_factor < 1.7  THEN 'Struggling'
        WHEN ease_factor < 2.1  THEN 'Hard'
        WHEN ease_factor < 2.5  THEN 'Learning'
        WHEN ease_factor < 2.9  THEN 'Good'
        WHEN ease_factor < 3.3  THEN 'Very Good'
        ELSE 'Mastered'
      END as bucket,
      COUNT(*) as count
    FROM cards
    WHERE repetitions > 0
    GROUP BY bucket
  `).all();

  res.json({ totalReviews, todayReviews, streak, overallRetention, heatmap, retention, weakest, easeDistrib });
});

module.exports = router;
