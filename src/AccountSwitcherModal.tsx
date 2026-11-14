import { Check, Plus, X } from 'lucide-react';
import { resolveDisplayName, type SavedAccount } from './accountStorage';

interface AccountSwitcherModalProps {
  accounts: SavedAccount[];
  activeEmail: string | null;
  darkMode: boolean;
  onSelect: (email: string) => void;
  onAddAccount: () => void;
  onClose: () => void;
}

export const AccountSwitcherModal = ({ accounts, activeEmail, darkMode, onSelect, onAddAccount, onClose }: AccountSwitcherModalProps) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
    <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">Alternar conta</h3>
        <button onClick={onClose} aria-label="Fechar"><X size={20} className="text-gray-400"/></button>
      </div>

      <div className="space-y-2">
        {accounts.map(account => {
          const isActive = account.email === activeEmail;
          const label = resolveDisplayName(account.displayName, account.email) ?? account.email;
          return (
            <button
              key={account.email}
              onClick={() => onSelect(account.email)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
                isActive
                  ? (darkMode ? 'border-emerald-500 bg-emerald-900/40' : 'border-emerald-500 bg-emerald-50')
                  : (darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50')
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                {label.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{label}</p>
                <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{account.email}</p>
              </div>
              {isActive && <Check size={18} className="text-emerald-600 shrink-0"/>}
            </button>
          );
        })}
      </div>

      <button
        onClick={onAddAccount}
        className={`w-full mt-4 py-3 border-2 border-dashed rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${darkMode ? 'border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-emerald-400' : 'border-gray-300 text-gray-600 hover:border-emerald-500 hover:text-emerald-600'}`}
      >
        <Plus size={16}/> Adicionar outra conta
      </button>
    </div>
  </div>
);
