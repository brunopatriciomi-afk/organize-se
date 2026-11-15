import { useRef, useState } from 'react';
import { Camera, Check, Edit2, User as UserIcon, X } from 'lucide-react';
import { resolveDisplayName } from './accountStorage';
import { readProfilePhoto } from './profilePhoto';

interface ProfileGreetingProps {
  displayName: string;
  email: string | null;
  photoURL: string | null;
  darkMode: boolean;
  onSaveName: (name: string) => Promise<void>;
  onSavePhoto: (dataUrl: string) => Promise<void>;
  onOpenAccounts: () => void;
}

export const ProfileGreeting = ({ displayName, email, photoURL, darkMode, onSaveName, onSavePhoto, onOpenAccounts }: ProfileGreetingProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSavingPhoto(true);
    setPhotoError('');
    try {
      await onSavePhoto(await readProfilePhoto(file));
    } catch (err) {
      console.error(err);
      setPhotoError('Não foi possível salvar a foto. Tente outra imagem.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const textColor = darkMode ? 'text-white' : 'text-gray-800';
  const iconButtonClass = `p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={savingPhoto}
              aria-label="Alterar foto de perfil"
              className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-60 ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}
            >
              {photoURL
                ? <img src={photoURL} alt="Foto de perfil" className="w-full h-full object-cover" />
                : <UserIcon size={28} />}
            </button>
            <span className="pointer-events-none absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-600 text-white shadow">
              <Camera size={12} />
            </span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>
          <div className="min-w-0">
            <h2 className={`text-2xl font-bold truncate ${textColor}`}>
              {greetingName ? `Olá, ${greetingName}` : 'Olá!'}
            </h2>
            {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={startEditing} aria-label="Editar nome" className={iconButtonClass}><Edit2 size={18}/></button>
          <button onClick={onOpenAccounts} className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
            Alternar conta
          </button>
        </div>
      </div>
      {photoError && <p className="text-xs text-rose-500">{photoError}</p>}

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
