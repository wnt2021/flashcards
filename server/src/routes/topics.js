const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/deck/:deckId', (req, res) => {
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(req.params.deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const topics = db.prepare(`
    SELECT t.*, COUNT(c.id) as card_count
    FROM topics t
    LEFT JOIN cards c ON c.topic_id = t.id
    WHERE t.deck_id = ?
    GROUP BY t.id
    ORDER BY t.created_at ASC
  `).all(req.params.deckId);
  res.json(topics);
});

router.post('/deck/:deckId', (req, res) => {
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(req.params.deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const { name, color = '#6366f1' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO topics (deck_id, name, color) VALUES (?, ?, ?)').run(req.params.deckId, name.trim(), color);
  res.json({ id: result.lastInsertRowid, deck_id: parseInt(req.params.deckId), name: name.trim(), color, card_count: 0 });
});

router.put('/:id', (req, res) => {
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  const { name = topic.name, color = topic.color } = req.body;
  db.prepare('UPDATE topics SET name = ?, color = ? WHERE id = ?').run(name.trim(), color, topic.id);
  res.json({ ...topic, name: name.trim(), color });
});

router.delete('/:id', (req, res) => {
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  db.prepare('UPDATE cards SET topic_id = NULL WHERE topic_id = ?').run(topic.id);
  db.prepare('DELETE FROM topics WHERE id = ?').run(topic.id);
  res.json({ success: true });
});

module.exports = router;
