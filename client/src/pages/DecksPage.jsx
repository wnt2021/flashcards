import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/ui/Modal';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function DecksPage() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDeck, setEditDeck] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get('/decks').then(r => { setDecks(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditDeck(null); setForm({ name: '', description: '', color: COLORS[0] }); setModalOpen(true); };
  const openEdit = (deck, e) => { e.preventDefault(); e.stopPropagation(); setEditDeck(deck); setForm({ name: deck.name, description: deck.description, color: deck.color }); setModalOpen(true); };

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editDeck) {
        const { data } = await api.put(`/decks/${editDeck.id}`, form);
        setDecks(d => d.map(x => x.id === editDeck.id ? { ...x, ...data } : x));
      } else {
        const { data } = await api.post('/decks', form);
        setDecks(d => [data, ...d]);
      }
      setModalOpen(false);
    } finally { setSaving(false); }
  };

  const deleteDeck = async (deck, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Delete "${deck.name}" and all its cards?`)) return;
    await api.delete(`/decks/${deck.id}`);
    setDecks(d => d.filter(x => x.id !== deck.id));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><span className="text-4xl animate-spin">⚡</span></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Decks</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-brand-500/20">
          <span>+</span> New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <span className="text-5xl">📚</span>
          <p className="text-gray-500 mt-4">No decks yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {decks.map(deck => (
            <Link key={deck.id} to={`/decks/${deck.id}`}
              className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: deck.color + '33' }}>
                  📚
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => openEdit(deck, e)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors">✏️</button>
                  <button onClick={e => deleteDeck(deck, e)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm transition-colors">🗑️</button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{deck.name}</h3>
              {deck.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{deck.description}</p>}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-400">{deck.card_count} cards</span>
                {deck.due_count > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full font-medium">
                    {deck.due_count} due
                  </span>
                )}
              </div>
              <div className="h-1 rounded-full mt-3 opacity-70" style={{ backgroundColor: deck.color }} />
            </Link>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editDeck ? 'Edit Deck' : 'New Deck'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. JavaScript Fundamentals" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="What's in this deck?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-all disabled:opacity-60">
            {saving ? 'Saving…' : editDeck ? 'Save Changes' : 'Create Deck'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
