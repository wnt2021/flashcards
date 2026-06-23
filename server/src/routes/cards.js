const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const router = express.Router();

const UPLOADS_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

function withTags(card) {
  const rows = db.prepare('SELECT t.name FROM tags t JOIN card_tags ct ON ct.tag_id = t.id WHERE ct.card_id = ? ORDER BY t.name').all(card.id);
  return { ...card, tags: rows.map(r => r.name) };
}

function setTags(cardId, tagNames) {
  db.prepare('DELETE FROM card_tags WHERE card_id = ?').run(cardId);
  for (const raw of tagNames) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (!tag) {
      const r = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
      tag = { id: r.lastInsertRowid };
    }
    db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(cardId, tag.id);
  }
}

router.get('/deck/:deckId', (req, res) => {
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(req.params.deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const { topic } = req.query;
  const cards = topic
    ? db.prepare('SELECT * FROM cards WHERE deck_id = ? AND topic_id = ? ORDER BY created_at DESC').all(req.params.deckId, topic)
    : db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC').all(req.params.deckId);
  res.json(cards.map(withTags));
});

router.get('/deck/:deckId/due', (req, res) => {
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(req.params.deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const { topic } = req.query;
  const cards = topic
    ? db.prepare("SELECT * FROM cards WHERE deck_id = ? AND topic_id = ? AND next_review <= datetime('now') ORDER BY next_review ASC").all(req.params.deckId, topic)
    : db.prepare("SELECT * FROM cards WHERE deck_id = ? AND next_review <= datetime('now') ORDER BY next_review ASC").all(req.params.deckId);
  res.json(cards.map(withTags));
});

router.get('/tags', (req, res) => {
  const { q } = req.query;
  const tags = q
    ? db.prepare("SELECT name FROM tags WHERE name LIKE ? ORDER BY name LIMIT 10").all(`%${q}%`)
    : db.prepare('SELECT name FROM tags ORDER BY name LIMIT 50').all();
  res.json(tags.map(t => t.name));
});

router.post('/deck/:deckId', upload.fields([{ name: 'front_image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]), (req, res) => {
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(req.params.deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  const { front, back, topic_id, tags } = req.body;
  if (!front || !back) return res.status(400).json({ error: 'Front and back text required' });
  const front_image = req.files?.front_image?.[0]?.filename || null;
  const back_image = req.files?.back_image?.[0]?.filename || null;
  const topicId = topic_id ? parseInt(topic_id) : null;
  const result = db.prepare('INSERT INTO cards (deck_id, topic_id, front, back, front_image, back_image) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.deckId, topicId, front, back, front_image, back_image);
  if (tags) setTags(result.lastInsertRowid, JSON.parse(tags));
  res.json(withTags(db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', upload.fields([{ name: 'front_image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]), (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const front = req.body.front || card.front;
  const back = req.body.back || card.back;
  const front_image = req.files?.front_image?.[0]?.filename || card.front_image;
  const back_image = req.files?.back_image?.[0]?.filename || card.back_image;
  const topicId = req.body.topic_id !== undefined ? (req.body.topic_id ? parseInt(req.body.topic_id) : null) : card.topic_id;
  db.prepare('UPDATE cards SET front = ?, back = ?, front_image = ?, back_image = ?, topic_id = ? WHERE id = ?').run(front, back, front_image, back_image, topicId, card.id);
  if (req.body.tags !== undefined) setTags(card.id, JSON.parse(req.body.tags));
  res.json(withTags(db.prepare('SELECT * FROM cards WHERE id = ?').get(card.id)));
});

router.delete('/:id', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  db.prepare('DELETE FROM cards WHERE id = ?').run(card.id);
  res.json({ success: true });
});

router.post('/:id/review', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const quality = parseInt(req.body.quality);
  if (![0, 1, 3, 4].includes(quality)) return res.status(400).json({ error: 'Quality must be 0, 1, 3, or 4' });
  let { ease_factor, interval, repetitions } = card;
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease_factor);
    repetitions += 1;
  }
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (4 - quality) * (0.08 + (4 - quality) * 0.02)));
  const next_review = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare('UPDATE cards SET ease_factor = ?, interval = ?, repetitions = ?, next_review = ? WHERE id = ?').run(ease_factor, interval, repetitions, next_review, card.id);
  db.prepare('INSERT INTO review_logs (card_id, quality, ease_factor_after, interval_after) VALUES (?, ?, ?, ?)').run(card.id, quality, ease_factor, interval);
  res.json({ interval, next_review });
});

module.exports = router;
