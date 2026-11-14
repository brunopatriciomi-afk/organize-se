import { useState } from 'react';
import { Check, Edit2, X } from 'lucide-react';
import { resolveDisplayName } from './accountStorage';

interface ProfileGreetingProps {
  displayName: string;
  email: string | null;
  darkMode: boolean;
  onSaveName: (name: string) => Promise<void>;
  onOpenAccounts: () => void;
}

export const ProfileGreeting = ({ displayName, email, darkMode, onSaveName, onOpenAccounts }: ProfileGreetingProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const greetingName = resolveDisplayName(displayName, email);

  const startEditing = () => {
    setDraft(displayName);
    setError('');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return setError('Digite seu nome.');
    setSaving(true);
    try {
      await onSaveName(trimmed);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError('Não foi possível salvar o nome. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const textColor = darkMode ? 'text-white' : 'text-gray-800';
  const iconButtonClass = `p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`text-2xl font-bold truncate ${textColor}`}>
            {greetingName ? `Olá, ${greetingName}` : 'Olá!'}
          </h2>
          {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={startEditing} aria-label="Editar nome" className={iconButtonClass}><Edit2 size={18}/></button>
          <button onClick={onOpenAccounts} className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
            Alternar conta
          </button>
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="space-y-2">
          <div className="flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={e => { setDraft(e.target.value); setError(''); }}
              placeholder="Seu nome"
              className={`flex-1 p-3 rounded-xl border outline-none focus:border-emerald-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
            />
            <button type="button" onClick={() => setIsEditing(false)} aria-label="Cancelar" className={iconButtonClass}><X size={18}/></button>
            <button type="submit" disabled={saving} aria-label="Salvar nome" className="px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center"><Check size={18}/></button>
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </form>
      )}
    </div>
  );
};
