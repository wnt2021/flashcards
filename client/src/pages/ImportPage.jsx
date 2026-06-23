import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

// ── CSV helpers ────────────────────────────────────────────────

function parseCSVRow(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function fixEncoding(str) {
  if (!str) return '';
  return str
    .replace(/â€™/g, '’').replace(/â€˜/g, '‘')
    .replace(/â€œ/g, '“').replace(/â€/g, '”')
    .replace(/â€"/g, '—').replace(/â€"/g, '–')
    .replace(/Â /g, ' ')
    .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê')
    .replace(/Ã /g, 'à').replace(/Ã¢/g, 'â').replace(/Ã®/g, 'î')
    .replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã»/g, 'û')
    .replace(/Ã§/g, 'ç').replace(/Ã‰/g, 'É').replace(/Ã€/g, 'À')
    .replace(/Â°/g, '°')
    .trim();
}

function stripQAPrefix(text) {
  return text.replace(/^[QqAa]:\s*/, '').trim();
}

function deckNameFromFilename(filename) {
  return filename
    .replace(/\.csv$/i, '')
    .replace(/^Flashcards\s*[-–—]\s*/i, '')
    .trim() || filename.replace(/\.csv$/i, '');
}

function processCSV(text) {
  const lines = text.split(/\r?\n/);
  const cards = [];
  const seen = new Set();
  let csvDupes = 0;

  // Skip header row if present
  const firstRow = lines[0] ? parseCSVRow(lines[0]) : [];
  const isHeader = /^(question|front|q)$/i.test(firstRow[0]?.trim() ?? '');
  const startIdx = isHeader ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = parseCSVRow(line);
    if (row.length < 2) continue;
    const front = fixEncoding(stripQAPrefix(row[0]));
    const back = fixEncoding(stripQAPrefix(row[1]));
    if (!front || !back) continue;
    const key = front.toLowerCase();
    if (seen.has(key)) { csvDupes++; continue; }
    seen.add(key);
    cards.push({ front, back });
  }

  return { cards, csvDupes };
}

// ── FileCard component ──────────────────────────────────────────

function FileCard({ item, onNameChange, onRemove, onImport }) {
  const { filename, deckName, cards, csvDupes, status, result } = item;
  const isDone = status === 'done';
  const isImporting = status === 'importing';
  const isError = status === 'error';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all
      ${isDone ? 'border-green-200 dark:border-green-800'
      : isError ? 'border-red-200 dark:border-red-800'
      : 'border-gray-100 dark:border-gray-800'}`}>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5 flex-shrink-0">
            {isDone ? '✅' : isError ? '❌' : '📄'}
          </span>

          <div className="flex-1 min-w-0">
            {isDone || isImporting ? (
              <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{deckName}</p>
            ) : (
              <input
                type="text"
                value={deckName}
                onChange={e => onNameChange(e.target.value)}
                placeholder="Deck name"
                className="w-full font-semibold bg-transparent text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-400 pb-0.5"
              />
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">{filename}</p>
          </div>

          {status === 'pending' && (
            <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none flex-shrink-0">×</button>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full font-medium">
            {cards.length} cards
          </span>
          {csvDupes > 0 && (
            <span className="text-xs px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full font-medium">
              {csvDupes} duplicate{csvDupes > 1 ? 's' : ''} removed
            </span>
          )}
          {isDone && result && (
            <>
              <span className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full font-medium">
                ✓ {result.imported} imported
              </span>
              {result.skipped > 0 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full font-medium">
                  {result.skipped} already existed
                </span>
              )}
            </>
          )}
          {isError && (
            <span className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full font-medium">
              Import failed — try again
            </span>
          )}
        </div>

        {/* Sample preview (only before import) */}
        {status === 'pending' && cards.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {cards.slice(0, 3).map((card, i) => (
              <div key={i} className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 space-y-0.5">
                <p className="text-gray-700 dark:text-gray-300 truncate">
                  <span className="font-semibold text-gray-400 mr-1.5">Q</span>{card.front}
                </p>
                <p className="text-gray-400 dark:text-gray-500 truncate">
                  <span className="font-semibold mr-1.5">A</span>{card.back}
                </p>
              </div>
            ))}
            {cards.length > 3 && (
              <p className="text-xs text-gray-400 text-center py-1">
                +{cards.length - 3} more cards
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action button */}
      {status === 'pending' && (
        <div className="px-4 pb-4">
          <button
            onClick={onImport}
            disabled={!deckName.trim()}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Import into &ldquo;{deckName || '…'}&rdquo;
          </button>
        </div>
      )}
      {isImporting && (
        <div className="px-4 pb-4">
          <div className="w-full py-2.5 bg-brand-100 dark:bg-brand-900/30 text-brand-500 rounded-xl font-semibold text-sm text-center">
            <span className="animate-pulse">Importing…</span>
          </div>
        </div>
      )}
      {isError && (
        <div className="px-4 pb-4">
          <button
            onClick={onImport}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────

export default function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback((fileList) => {
    const csvFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (!csvFiles.length) return;

    csvFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const { cards, csvDupes } = processCSV(e.target.result);
        setItems(prev => {
          const alreadyAdded = prev.some(i => i.filename === file.name);
          if (alreadyAdded) return prev;
          return [...prev, {
            id: `${file.name}-${Date.now()}`,
            filename: file.name,
            deckName: deckNameFromFilename(file.name),
            cards,
            csvDupes,
            status: 'pending',
            result: null,
          }];
        });
      };
      reader.readAsText(file, 'utf-8');
    });
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const updateName = (id, name) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, deckName: name } : i));

  const removeItem = (id) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const importItem = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'importing' } : i));
    try {
      const { data } = await api.post('/import', {
        deckName: item.deckName,
        cards: item.cards,
        skipDuplicates: true,
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'done', result: data } : i));
    } catch {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const importAll = async () => {
    const pending = items.filter(i => i.status === 'pending');
    for (const item of pending) await importItem(item.id);
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const doneCount = items.filter(i => i.status === 'done').length;
  const allDone = items.length > 0 && pendingCount === 0 && items.every(i => i.status === 'done');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">Import from CSV</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Drop one or multiple CSV files — each file becomes one deck. Supports Vaia exports directly.
      </p>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6
          ${dragging
            ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 scale-[1.01]'
            : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
      >
        <span className="text-4xl">{dragging ? '📬' : '📂'}</span>
        <p className="mt-2 font-semibold text-gray-700 dark:text-gray-300">
          {dragging ? 'Release to load files' : 'Drop CSV files here'}
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse · multiple files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={e => { processFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map(item => (
            <FileCard
              key={item.id}
              item={item}
              onNameChange={name => updateName(item.id, name)}
              onRemove={() => removeItem(item.id)}
              onImport={() => importItem(item.id)}
            />
          ))}

          {/* Import all button — only shown when 2+ pending */}
          {pendingCount >= 2 && (
            <button
              onClick={importAll}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors"
            >
              Import All {pendingCount} Decks
            </button>
          )}

          {/* Done state */}
          {allDone && (
            <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-800">
              <span className="text-3xl">🎉</span>
              <p className="font-semibold text-green-700 dark:text-green-400 mt-2">
                All {doneCount} deck{doneCount > 1 ? 's' : ''} imported successfully
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {items.reduce((s, i) => s + (i.result?.imported ?? 0), 0)} cards total
              </p>
              <button
                onClick={() => navigate('/decks')}
                className="mt-4 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Go to My Decks →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
