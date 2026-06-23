const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const decks = db.prepare(`
    SELECT d.*,
      COUNT(c.id) as card_count,
      SUM(CASE WHEN c.next_review <= datetime('now') THEN 1 ELSE 0 END) as due_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all();
  res.json(decks);
});

router.post('/', (req, res) => {
  const { name, description = '', color = '#6366f1' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO decks (name, description, color) VALUES (?, ?, ?)').run(name, description, color);
  res.json({ id: result.lastInsertRowid, name, description, color, card_count: 0, due_count: 0 });
});

router.get('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  res.json(deck);
});

router.put('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const { name = deck.name, description = deck.description, color = deck.color } = req.body;
  db.prepare('UPDATE decks SET name = ?, description = ?, color = ? WHERE id = ?').run(name, description, color, deck.id);
  res.json({ ...deck, name, description, color });
});

router.delete('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  db.prepare('DELETE FROM decks WHERE id = ?').run(deck.id);
  res.json({ success: true });
});

module.exports = router;
