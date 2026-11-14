import { useState } from 'react';
import { X } from 'lucide-react';

interface RenameCategoryModalProps {
  currentName: string;
  existingNames: string[];
  darkMode: boolean;
  onSave: (newName: string) => Promise<void>;
  onClose: () => void;
}

export const RenameCategoryModal = ({ currentName, existingNames, darkMode, onSave, onClose }: RenameCategoryModalProps) => {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Digite um nome para a categoria.');
    if (trimmed !== currentName && existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      return setError('Já existe uma categoria com esse nome.');
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } catch (err) {
      console.error(err);
      setError('Não foi possível salvar. Tente novamente.');
      setSaving(false);
    }
  };

  const inputClass = `w-full p-3 rounded-xl border outline-none focus:border-emerald-500 transition-colors ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <form onSubmit={handleSubmit} className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Renomear Categoria</h3>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={20} className="text-gray-400"/></button>
        </div>
        <label className="text-[10px] font-bold text-gray-400 uppercase">Novo nome</label>
        <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(''); }} className={`${inputClass} mt-1`} />
        {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
        <p className="text-[11px] text-gray-400 mt-3">O nome também será atualizado em todas as transações desta categoria.</p>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold text-sm">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
};
