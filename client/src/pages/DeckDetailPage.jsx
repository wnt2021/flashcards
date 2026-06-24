import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import TagInput from '../components/ui/TagInput';

const TOPIC_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function DeckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  // Card modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [cardForm, setCardForm] = useState({ front: '', back: '', topic_id: '', tags: [] });
  const [frontImgPreview, setFrontImgPreview] = useState(null);
  const [backImgPreview, setBackImgPreview] = useState(null);
  const frontFileRef = useRef();
  const backFileRef = useRef();
  const [saving, setSaving] = useState(false);

  // Bulk selection
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [bulkTopic, setBulkTopic] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Topics modal
  const [topicsModalOpen, setTopicsModalOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({ name: '', color: TOPIC_COLORS[0] });
  const [editTopic, setEditTopic] = useState(null);
  const [savingTopic, setSavingTopic] = useState(false);

  const loadCards = async (topicId = selectedTopic) => {
    const url = topicId ? `/cards/deck/${id}?topic=${topicId}` : `/cards/deck/${id}`;
    const { data } = await api.get(url);
    setCards(data);
  };

  const load = async () => {
    const [d, t] = await Promise.all([api.get(`/decks/${id}`), api.get(`/topics/deck/${id}`)]);
    setDeck(d.data);
    setTopics(t.data);
    await loadCards(null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleTopicFilter = async topicId => {
    setSelectedTopic(topicId);
    await loadCards(topicId);
  };

  // ── Card modal ──────────────────────────────────────────────
  const openCreate = () => {
    setEditCard(null);
    setCardForm({ front: '', back: '', topic_id: selectedTopic || '', tags: [] });
    setFrontImgPreview(null); setBackImgPreview(null);
    setCardModalOpen(true);
  };

  const openEdit = card => {
    setEditCard(card);
    setCardForm({ front: card.front, back: card.back, topic_id: card.topic_id || '', tags: card.tags || [] });
    setFrontImgPreview(card.front_image ? `/uploads/${card.front_image}` : null);
    setBackImgPreview(card.back_image ? `/uploads/${card.back_image}` : null);
    setCardModalOpen(true);
  };

  const handleFile = (side, file) => {
    if (!file) return;
    if (side === 'front') setFrontImgPreview(URL.createObjectURL(file));
    else setBackImgPreview(URL.createObjectURL(file));
  };

  const saveCard = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('front', cardForm.front);
      fd.append('back', cardForm.back);
      fd.append('topic_id', cardForm.topic_id || '');
      fd.append('tags', JSON.stringify(cardForm.tags));
      if (frontFileRef.current?.files?.[0]) fd.append('front_image', frontFileRef.current.files[0]);
      if (backFileRef.current?.files?.[0]) fd.append('back_image', backFileRef.current.files[0]);

      if (editCard) {
        const { data } = await api.put(`/cards/${editCard.id}`, fd);
        setCards(c => c.map(x => x.id === editCard.id ? data : x));
      } else {
        const { data } = await api.post(`/cards/deck/${id}`, fd);
        if (!selectedTopic || data.topic_id === selectedTopic) {
          setCards(c => [data, ...c]);
        }
      }
      setCardModalOpen(false);
    } finally { setSaving(false); }
  };

  const deleteCard = async card => {
    if (!confirm('Delete this card?')) return;
    await api.delete(`/cards/${card.id}`);
    setCards(c => c.filter(x => x.id !== card.id));
  };

  // ── Topics modal ────────────────────────────────────────────
  const openTopicsModal = () => {
    setEditTopic(null);
    setTopicForm({ name: '', color: TOPIC_COLORS[0] });
    setTopicsModalOpen(true);
  };

  const startEditTopic = topic => {
    setEditTopic(topic);
    setTopicForm({ name: topic.name, color: topic.color });
  };

  const saveTopic = async e => {
    e.preventDefault();
    setSavingTopic(true);
    try {
      if (editTopic) {
        const { data } = await api.put(`/topics/${editTopic.id}`, topicForm);
        setTopics(t => t.map(x => x.id === editTopic.id ? { ...x, ...data } : x));
      } else {
        const { data } = await api.post(`/topics/deck/${id}`, topicForm);
        setTopics(t => [...t, data]);
      }
      setEditTopic(null);
      setTopicForm({ name: '', color: TOPIC_COLORS[0] });
    } finally { setSavingTopic(false); }
  };

  const toggleSelectMode = () => {
    setSelectMode(s => !s);
    setSelectedCards(new Set());
    setBulkTopic('');
  };

  const toggleCardSelect = cardId => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const assignBulkTopic = async () => {
    if (selectedCards.size === 0) return;
    setAssigning(true);
    try {
      await api.put('/cards/bulk-topic', {
        cardIds: Array.from(selectedCards),
        topicId: bulkTopic || null,
      });
      await loadCards();
      setSelectMode(false);
      setSelectedCards(new Set());
      setBulkTopic('');
    } finally {
      setAssigning(false);
    }
  };

  const deleteTopic = async topic => {
    if (!confirm(`Delete topic "${topic.name}"? Cards in this topic will become uncategorised.`)) return;
    await api.delete(`/topics/${topic.id}`);
    setTopics(t => t.filter(x => x.id !== topic.id));
    if (selectedTopic === topic.id) handleTopicFilter(null);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><span className="text-4xl animate-spin">⚡</span></div>;

  const studyUrl = selectedTopic ? `/study/${id}?topic=${selectedTopic}` : `/study/${id}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/decks')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">←</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deck?.name}</h1>
          {deck?.description && <p className="text-sm text-gray-400">{deck.description}</p>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <a href={studyUrl}
          onClick={e => { e.preventDefault(); navigate(studyUrl); }}
          className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-center transition-colors shadow-lg shadow-brand-500/20 text-sm">
          🎯 Study Now
        </a>
        <button onClick={openCreate}
          className="flex-1 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 rounded-xl font-semibold text-sm transition-colors">
          + Add Card
        </button>
        {cards.length > 0 && (
          <button onClick={toggleSelectMode}
            className={`px-4 py-3 rounded-xl font-semibold text-sm transition-colors border ${
              selectMode
                ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
            }`}>
            ☑
          </button>
        )}
      </div>

      {/* Topics filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Topics</span>
          <button onClick={openTopicsModal}
            className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            Manage
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleTopicFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTopic === null
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            All <span className="opacity-60 text-xs ml-1">{cards.length > 0 || selectedTopic === null ? '' : ''}</span>
          </button>
          {topics.map(topic => (
            <button key={topic.id} onClick={() => handleTopicFilter(topic.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedTopic === topic.id
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={selectedTopic === topic.id ? { backgroundColor: topic.color } : {}}>
              {topic.name}
              {topic.card_count > 0 && <span className="ml-1.5 opacity-70 text-xs">{topic.card_count}</span>}
            </button>
          ))}
          {topics.length === 0 && (
            <button onClick={openTopicsModal}
              className="px-3 py-1.5 rounded-full text-sm text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              + Add first topic
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      {cards.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <span className="text-5xl">🃏</span>
          <p className="text-gray-500 mt-4">{selectedTopic ? 'No cards in this topic yet.' : 'No cards yet. Add your first card!'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => {
            const topic = topics.find(t => t.id === card.topic_id);
            return (
              <div
                key={card.id}
                onClick={() => selectMode && toggleCardSelect(card.id)}
                className={`rounded-2xl p-4 shadow-sm border transition-all group ${
                  selectMode ? 'cursor-pointer select-none' : ''
                } ${
                  selectedCards.has(card.id)
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-400 dark:border-brand-500'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                }`}>
                <div className="flex items-start gap-3">
                  {selectMode && (
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      selectedCards.has(card.id)
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                    }`}>
                      {selectedCards.has(card.id) && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {topic && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: topic.color }}>
                          {topic.name}
                        </span>
                      )}
                      {card.tags?.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">Q</span>
                    </div>
                    {card.front_image && <img src={`/uploads/${card.front_image}`} alt="" className="w-16 h-12 object-cover rounded-lg mb-1" />}
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{card.front}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">A</span>
                    </div>
                    {card.back_image && <img src={`/uploads/${card.back_image}`} alt="" className="w-16 h-12 object-cover rounded-lg mb-1" />}
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{card.back}</p>
                  </div>
                  {!selectMode && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(card)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-sm transition-colors">✏️</button>
                      <button onClick={() => deleteCard(card)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm transition-colors">🗑️</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                  <span className="text-xs text-gray-400">Interval: {card.interval}d</span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-gray-400">EF: {Number(card.ease_factor).toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bulk select toolbar ───────────────────────────────── */}
      {selectMode && (
        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 md:left-56 z-40 px-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-3 shadow-2xl flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-semibold shrink-0">{selectedCards.size} selected</span>
              <button
                onClick={() => setSelectedCards(selectedCards.size === cards.length ? new Set() : new Set(cards.map(c => c.id)))}
                className="text-xs text-gray-400 hover:text-white transition-colors shrink-0">
                {selectedCards.size === cards.length ? 'Deselect all' : 'Select all'}
              </button>
              <div className="flex-1" />
              {topics.length > 0 ? (
                <select
                  value={bulkTopic}
                  onChange={e => setBulkTopic(e.target.value)}
                  className="bg-gray-800 dark:bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm border border-gray-600 focus:outline-none shrink-0">
                  <option value="">No topic</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <span className="text-gray-400 text-xs">Create topics first</span>
              )}
              <button
                onClick={assignBulkTopic}
                disabled={selectedCards.size === 0 || assigning}
                className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 rounded-lg text-sm font-semibold text-white shrink-0 transition-colors">
                {assigning ? 'Saving…' : 'Assign'}
              </button>
              <button
                onClick={toggleSelectMode}
                className="px-3 py-1.5 bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 rounded-lg text-sm text-white shrink-0 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Card Modal ─────────────────────────────────────────── */}
      <Modal open={cardModalOpen} onClose={() => setCardModalOpen(false)} title={editCard ? 'Edit Card' : 'New Card'}>
        <form onSubmit={saveCard} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Front (Question)</label>
            <textarea value={cardForm.front} onChange={e => setCardForm(f => ({ ...f, front: e.target.value }))} required rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            <div className="mt-2 flex items-center gap-2">
              {frontImgPreview && <img src={frontImgPreview} alt="" className="w-16 h-12 rounded-lg object-cover" />}
              <button type="button" onClick={() => frontFileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
                📎 {frontImgPreview ? 'Change image' : 'Add image'}
              </button>
              {frontImgPreview && <button type="button" onClick={() => { setFrontImgPreview(null); frontFileRef.current.value = ''; }} className="text-xs text-red-500">Remove</button>}
              <input type="file" accept="image/*" ref={frontFileRef} className="hidden" onChange={e => handleFile('front', e.target.files?.[0])} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Back (Answer)</label>
            <textarea value={cardForm.back} onChange={e => setCardForm(f => ({ ...f, back: e.target.value }))} required rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            <div className="mt-2 flex items-center gap-2">
              {backImgPreview && <img src={backImgPreview} alt="" className="w-16 h-12 rounded-lg object-cover" />}
              <button type="button" onClick={() => backFileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
                📎 {backImgPreview ? 'Change image' : 'Add image'}
              </button>
              {backImgPreview && <button type="button" onClick={() => { setBackImgPreview(null); backFileRef.current.value = ''; }} className="text-xs text-red-500">Remove</button>}
              <input type="file" accept="image/*" ref={backFileRef} className="hidden" onChange={e => handleFile('back', e.target.files?.[0])} />
            </div>
          </div>

          {topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic <span className="font-normal text-gray-400">(optional)</span></label>
              <select value={cardForm.topic_id} onChange={e => setCardForm(f => ({ ...f, topic_id: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">No topic</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags <span className="font-normal text-gray-400">(optional)</span></label>
            <TagInput value={cardForm.tags} onChange={tags => setCardForm(f => ({ ...f, tags }))} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-all disabled:opacity-60">
            {saving ? 'Saving…' : editCard ? 'Save Changes' : 'Add Card'}
          </button>
        </form>
      </Modal>

      {/* ── Topics Modal ───────────────────────────────────────── */}
      <Modal open={topicsModalOpen} onClose={() => { setTopicsModalOpen(false); setEditTopic(null); }} title="Manage Topics">
        <div className="space-y-4">
          {/* Existing topics */}
          {topics.length > 0 && (
            <div className="space-y-2">
              {topics.map(topic => (
                <div key={topic.id} className="flex items-center gap-3">
                  {editTopic?.id === topic.id ? (
                    <form onSubmit={saveTopic} className="flex-1 flex gap-2">
                      <input value={topicForm.name} onChange={e => setTopicForm(f => ({ ...f, name: e.target.value }))} autoFocus
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <div className="flex gap-1">
                        {TOPIC_COLORS.map(c => (
                          <button key={c} type="button" onClick={() => setTopicForm(f => ({ ...f, color: c }))}
                            className={`w-5 h-5 rounded-full transition-transform ${topicForm.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <button type="submit" disabled={savingTopic} className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium">Save</button>
                      <button type="button" onClick={() => setEditTopic(null)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">Cancel</button>
                    </form>
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: topic.color }} />
                      <span className="flex-1 text-sm font-medium">{topic.name}</span>
                      <span className="text-xs text-gray-400">{topic.card_count} cards</span>
                      <button onClick={() => startEditTopic(topic)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs transition-colors">✏️</button>
                      <button onClick={() => deleteTopic(topic)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs transition-colors">🗑️</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new topic */}
          {!editTopic && (
            <form onSubmit={saveTopic} className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add new topic</p>
              <input value={topicForm.name} onChange={e => setTopicForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="e.g. Social Psychology" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Color:</span>
                {TOPIC_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setTopicForm(f => ({ ...f, color: c }))}
                    className={`w-6 h-6 rounded-full transition-transform ${topicForm.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button type="submit" disabled={savingTopic}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all disabled:opacity-60">
                {savingTopic ? 'Adding…' : '+ Add Topic'}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
