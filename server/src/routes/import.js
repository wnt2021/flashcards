const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { deckName, cards, skipDuplicates = true } = req.body;

  if (!deckName?.trim() || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'deckName and cards[] are required' });
  }

  const name = deckName.trim();

  let deck = db.prepare('SELECT id FROM decks WHERE name = ?').get(name);
  if (!deck) {
    const r = db.prepare('INSERT INTO decks (name) VALUES (?)').run(name);
    deck = { id: r.lastInsertRowid };
  }

  const checkDupe = db.prepare('SELECT id FROM cards WHERE deck_id = ? AND LOWER(front) = LOWER(?)');
  const insert = db.prepare('INSERT INTO cards (deck_id, front, back) VALUES (?, ?, ?)');

  let imported = 0;
  let skipped = 0;

  db.transaction(() => {
    for (const card of cards) {
      const front = (card.front || '').trim();
      const back = (card.back || '').trim();
      if (!front || !back) continue;
      if (skipDuplicates && checkDupe.get(deck.id, front)) { skipped++; continue; }
      insert.run(deck.id, front, back);
      imported++;
    }
  })();

  res.json({ imported, skipped, deckId: deck.id });
});

module.exports = router;
