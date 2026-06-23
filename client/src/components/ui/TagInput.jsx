import { useState, useRef } from 'react';

export default function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState('');
  const inputRef = useRef();

  const add = raw => {
    const tag = raw.trim().toLowerCase();
    if (!tag || value.includes(tag)) { setInput(''); return; }
    onChange([...value, tag]);
    setInput('');
  };

  const remove = tag => onChange(value.filter(t => t !== tag));

  const onKey = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
    if (e.key === 'Backspace' && !input && value.length) remove(value[value.length - 1]);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-text focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-md text-xs font-medium">
          #{tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-red-500 transition-colors leading-none">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={value.length === 0 ? 'Add tags (Enter or comma to confirm)' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
      />
    </div>
  );
}
