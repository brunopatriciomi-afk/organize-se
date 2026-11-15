import { ArrowDown, ArrowUp } from 'lucide-react';

interface CategoryMoveButtonsProps {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  darkMode: boolean;
  onMove: (delta: -1 | 1) => void;
}

export const CategoryMoveButtons = ({ label, canMoveUp, canMoveDown, darkMode, onMove }: CategoryMoveButtonsProps) => {
  const buttonClass = `p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${darkMode ? 'text-gray-300 hover:text-emerald-400' : 'text-gray-400 hover:text-emerald-600'}`;
  return (
    <div className="flex items-center">
      <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={`Mover ${label} para cima`} className={buttonClass}><ArrowUp size={14}/></button>
      <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={`Mover ${label} para baixo`} className={buttonClass}><ArrowDown size={14}/></button>
    </div>
  );
};
