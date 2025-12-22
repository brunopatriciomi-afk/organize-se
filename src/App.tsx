import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  LayoutDashboard, CreditCard, PieChart as PieChartIcon, User as UserIcon, 
  Plus, ChevronLeft, ChevronRight, Wallet, ArrowUpCircle, ArrowDownCircle, 
  Trash2, Edit2, X, Loader2, LogIn, LogOut, Filter, Settings, Target, DollarSign, AlertCircle, Check, AlertTriangle, Save
} from 'lucide-react';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, onAuthStateChanged, signOut, type User 
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';

// --- 1. TIPOS E CONFIGURAÇÕES ---
export enum AppScreen { Home, Reports, Cards, Profile, Add }

export interface UserSettings {
  monthlyIncome: number;
  financialGoal: number;
  darkMode: boolean;
  categoryLimits: Record<string, number>; // Novo: Limites por categoria
}

export interface CardData {
  id: string;
  name: string;
  holder: string; 
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'Entrada' | 'Saída';
  category: string;
  date: string;
  month: string;
  paymentMethod: 'Dinheiro' | 'Cartão';
  cardId?: string;
  installment?: { current: number; total: number };
  parentId?: string;
}

const DEFAULT_CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Compras', 'Serviços', 'Assinaturas'];
const INITIAL_CARDS: CardData[] = [
  { id: 'card_nubank', name: 'Nubank', holder: 'Você', limit: 5000, closingDay: 1, dueDay: 8, color: 'border-l-purple-600' },
  { id: 'card_inter', name: 'Inter', holder: 'Você', limit: 3000, closingDay: 10, dueDay: 17, color: 'border-l-orange-500' },
];

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- 2. UTILITÁRIOS ---
const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateString: string) => {
  if(!dateString) return '';
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}`;
};
const generateId = () => Math.random().toString(36).substr(2, 9);
const getMonthKey = (date: Date) => date.toISOString().slice(0, 7);

// --- 3. COMPONENTES ---

// --- TELA: HOME ---
const Home = ({ transactions, monthDetails, onDelete }: any) => {
  return (
    <div className="space-y-6 p-4 pb-32">
      <div className="rounded-[32px] p-6 shadow-xl bg-emerald-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120} /></div>
        <p className="text-emerald-100 font-medium mb-1 text-sm">Saldo em Conta</p>
        <h1 className="text-4xl font-bold mb-8">{formatCurrency(monthDetails.balance)}</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-emerald-700/50 px-4 py-3 rounded-2xl flex-1 backdrop-blur-sm">
            <div className="p-1.5 bg-emerald-400/20 rounded-full"><ArrowUpCircle size={18} className="text-emerald-200"/></div>
            <div>
              <p className="text-[10px] uppercase text-emerald-200 font-bold tracking-wider">Entradas</p>
              <p className="font-bold text-sm">{formatCurrency(monthDetails.income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-700/50 px-4 py-3 rounded-2xl flex-1 backdrop-blur-sm">
            <div className="p-1.5 bg-rose-400/20 rounded-full"><ArrowDownCircle size={18} className="text-rose-200"/></div>
            <div>
              <p className="text-[10px] uppercase text-rose-200 font-bold tracking-wider">Saídas</p>
              <p className="font-bold text-sm">{formatCurrency(monthDetails.expenses)}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">Histórico Recente</h2>
        <div className="space-y-3">
          {transactions.slice(0, 15).map((t: Transaction) => (
            <div key={t.id} className="group flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-50 hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${t.type === 'Entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {t.type === 'Entrada' ? <ArrowUpCircle size={20}/> : <ArrowDownCircle size={20}/>}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{t.description}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    {t.category} • {formatDate(t.date)}
                    {t.installment && <span className="text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded text-[10px] ml-1">{t.installment.current}/{t.installment.total}</span>}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${t.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'Saída' ? '-' : '+'}{formatCurrency(t.amount)}
                </p>
                <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-rose-500 p-1 -mr-2"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">Nenhuma movimentação neste mês.</p>}
        </div>
      </div>
    </div>
  );
};

// --- TELA: CARTÕES ---
const CardsScreen = ({ cards, transactions, currentMonthKey, onSaveCard }: any) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHolder, setEditHolder] = useState('');

  const getInvoiceTotal = (cardId: string, monthKey: string) => {
    return transactions
      .filter((t: Transaction) => t.cardId === cardId && t.month === monthKey && t.type === 'Saída')
      .reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  };

  const activeCard = cards.find((c: CardData) => c.id === selectedCardId);

  const startEditing = () => {
    if(activeCard) {
      setEditName(activeCard.name);
      setEditHolder(activeCard.holder);
      setIsEditing(true);
    }
  };

  const saveEdit = () => {
    if(activeCard) {
      onSaveCard({ ...activeCard, name: editName, holder: editHolder });
      setIsEditing(false);
    }
  };

  if (selectedCardId && activeCard) {
    const currentInvoice = getInvoiceTotal(activeCard.id, currentMonthKey);
    const [y, mStr] = currentMonthKey.split('-');
    const monthName = MONTHS_FULL[parseInt(mStr) - 1];

    const futureInvoices = [1, 2, 3].map(offset => {
      const date = new Date(parseInt(y), parseInt(mStr) - 1 + offset, 1);
      const key = getMonthKey(date);
      const total = getInvoiceTotal(activeCard.id, key);
      return { label: MONTHS[date.getMonth()], total, key };
    });

    return (
       <div className="p-4 pb-32 space-y-6 bg-gray-50 min-h-full">
         <div className="flex items-center justify-between">
            <button onClick={() => setSelectedCardId(null)} className="p-2 hover:bg-white rounded-full"><ChevronLeft size={24} className="text-gray-600"/></button>
            <h2 className="font-bold text-lg">{activeCard.name} ({activeCard.holder})</h2>
            <button onClick={startEditing} className="p-2 hover:bg-white rounded-full"><Edit2 size={20} className="text-gray-600"/></button>
         </div>

         {isEditing && (
           <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 space-y-3 animate-in fade-in">
              <h3 className="font-bold text-sm text-gray-800">Editar Cartão</h3>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Cartão</label>
                <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full p-2 border rounded-lg"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Titular</label>
                <select value={editHolder} onChange={e=>setEditHolder(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                  <option value="Você">Você</option>
                  <option value="Cônjuge">Cônjuge</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 text-gray-500 font-bold text-xs">Cancelar</button>
                <button onClick={saveEdit} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs">Salvar</button>
              </div>
           </div>
         )}

         <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 text-center">
            <div className="flex items-center gap-2 mb-4">
               <CreditCard size={18} className="text-emerald-600"/>
               <span className="text-emerald-600 font-bold text-xs uppercase tracking-widest">FATURA — {monthName.toUpperCase()}</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{formatCurrency(currentInvoice)}</h1>
            <p className="text-xs text-gray-400 mb-8">Total da Fatura</p>

            <div className="flex justify-between border-t border-gray-100 pt-6">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Fecha em</p>
                  <p className="font-bold text-gray-800">{activeCard.closingDay.toString().padStart(2,'0')}/{mStr}</p>
                </div>
                <div className="w-px bg-gray-100 mx-4"></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 text-rose-500">Vence em</p>
                  <p className="font-bold text-rose-500">{activeCard.dueDay.toString().padStart(2,'0')}/{mStr}</p>
                </div>
            </div>
         </div>

         <div>
            <h3 className="font-bold text-gray-800 mb-4 text-sm">Próximas Faturas</h3>
            <div className="space-y-3">
               {futureInvoices.every(i => i.total === 0) ? (
                 <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
                   Nenhuma fatura futura prevista.
                 </div>
               ) : (
                 futureInvoices.map(inv => (
                   <div key={inv.key} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100">
                      <span className="font-bold text-gray-500 uppercase text-xs">{inv.label}</span>
                      <span className={`font-bold ${inv.total > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{inv.total > 0 ? formatCurrency(inv.total) : '-'}</span>
                   </div>
                 ))
               )}
            </div>
         </div>
       </div>
    );
  }

  return (
    <div className="p-4 pb-32 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Meus Cartões</h2>
      <div className="space-y-4">
        {cards.map((card: CardData) => {
           const invoice = getInvoiceTotal(card.id, currentMonthKey);
           const limitUsedPercent = Math.min((invoice / card.limit) * 100, 100);
           
           return (
             <div key={card.id} onClick={() => setSelectedCardId(card.id)} 
               className={`bg-white rounded-2xl p-5 shadow-sm border-gray-100 border ${card.color || 'border-l-emerald-500'} border-l-4 cursor-pointer hover:shadow-md transition-all relative overflow-hidden`}
             >
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 p-2 rounded-full text-emerald-600"><CreditCard size={20}/></div>
                      <div>
                        <h3 className="font-bold text-gray-800">{card.name} ({card.holder})</h3>
                        <p className="text-xs text-gray-400">{card.holder}</p>
                      </div>
                   </div>
                   <ChevronRight size={20} className="text-gray-300"/>
                </div>
                <div>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Limite Disponível</span>
                      <span className="font-bold text-gray-800">{formatCurrency(card.limit - invoice)}</span>
                   </div>
                   <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width: `${100 - limitUsedPercent}%`}}></div>
                   </div>
                </div>
             </div>
           );
        })}
      </div>
      <button onClick={() => onSaveCard({ id: generateId(), name: 'Novo Cartão', holder: 'Você', limit: 1000, closingDay: 1, dueDay: 10, color: 'border-l-gray-500' })} 
        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 hover:border-emerald-500 hover:text-emerald-500 transition-colors">
        + Adicionar Novo Cartão
      </button>
    </div>
  );
};

// --- TELA: RELATÓRIOS ---
const Reports = ({ transactions, categories }: any) => {
  const [filterType, setFilterType] = useState('Saída');
  const [filterCat, setFilterCat] = useState('Todas');

  const data = useMemo(() => {
    let filtered = transactions.filter((t:any) => t.type === filterType);
    if(filterCat !== 'Todas') filtered = filtered.filter((t:any) => t.category === filterCat);
    const map = new Map();
    filtered.forEach((t: any) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [transactions, filterType, filterCat]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="p-4 pb-32">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Relatórios</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
         <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200"><Filter size={14} className="text-gray-400"/></div>
         <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 outline-none">
            <option value="Saída">Despesas</option>
            <option value="Entrada">Receitas</option>
         </select>
         <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 outline-none">
            <option value="Todas">Todas Categorias</option>
            {categories.map((c:string) => <option key={c} value={c}>{c}</option>)}
         </select>
      </div>

      {data.length > 0 ? (
        <>
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 h-80 mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(data.reduce((acc:number, curr:any) => acc + curr.value, 0))}</p>
            </div>
          </div>
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Detalhamento</h3>
          <div className="space-y-2">
            {data.map((item:any, idx) => (
              <div key={item.name} className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}} />
                    <span className="text-sm font-medium text-gray-600">{item.name}</span>
                </div>
                <span className="font-bold text-sm text-gray-800">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white p-10 rounded-[32px] text-center border border-dashed border-gray-200 mt-4">
           <p className="text-gray-400 text-sm">Sem dados para este período.</p>
        </div>
      )}
    </div>
  );
};

// --- TELA: PERFIL (COM EDIÇÃO REAL DE RENDA/META/LIMITES) ---
const Profile = ({ user, categories, settings, onUpdateSettings, onAddCategory, onDeleteCategory, onLogout, monthlySavings }: any) => {
  const [showCats, setShowCats] = useState(false);
  const [newCat, setNewCat] = useState('');
  
  // Estados para edição
  const [editingField, setEditingField] = useState<'income' | 'goal' | null>(null);
  const [tempValue, setTempValue] = useState('');

  const handleEdit = (field: 'income' | 'goal') => {
    setEditingField(field);
    setTempValue(field === 'income' ? settings.monthlyIncome.toString() : settings.financialGoal.toString());
  };

  const saveField = () => {
    if(editingField === 'income') onUpdateSettings({...settings, monthlyIncome: parseFloat(tempValue)});
    if(editingField === 'goal') onUpdateSettings({...settings, financialGoal: parseFloat(tempValue)});
    setEditingField(null);
  };

  const updateCategoryLimit = (cat: string, limit: string) => {
    const newLimits = { ...settings.categoryLimits, [cat]: parseFloat(limit) };
    onUpdateSettings({ ...settings, categoryLimits: newLimits });
  };

  return (
    <div className="p-4 pb-32 space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Perfil</h2>
         <div className="p-2 bg-gray-100 rounded-full"><Settings size={20} className="text-gray-500"/></div>
      </div>

      <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
         <div className="absolute -right-4 -top-4 opacity-10"><DollarSign size={100}/></div>
         <div className="flex items-center gap-2 mb-2 opacity-90">
            <DollarSign size={16}/> <span className="text-xs font-bold uppercase tracking-wider">Economia Mensal</span>
         </div>
         <h1 className="text-3xl font-bold mb-4">{formatCurrency(monthlySavings)}</h1>
         <div className="h-1 bg-black/20 rounded-full w-full mb-1">
             <div className="bg-white h-full rounded-full" style={{width: `${Math.min((monthlySavings/settings.monthlyIncome)*100, 100)}%`}}></div>
         </div>
         <p className="text-[10px] text-emerald-100 text-right">de {formatCurrency(settings.monthlyIncome)} (Renda)</p>
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mt-4">Configurações</p>

      <div className="space-y-3">
         {/* Renda Mensal (Editável) */}
         <div className="bg-white p-4 rounded-2xl border border-gray-100">
            {editingField === 'income' ? (
              <div className="flex gap-2 items-center">
                <input autoFocus type="number" value={tempValue} onChange={e=>setTempValue(e.target.value)} className="w-full p-2 border rounded-lg" />
                <button onClick={saveField} className="bg-emerald-600 text-white p-2 rounded-lg"><Check size={18}/></button>
              </div>
            ) : (
              <div onClick={() => handleEdit('income')} className="flex items-center justify-between cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Wallet size={20}/></div>
                    <div>
                       <p className="font-bold text-gray-800 text-sm">Renda Mensal</p>
                       <p className="text-xs text-gray-400">{formatCurrency(settings.monthlyIncome)}</p>
                    </div>
                 </div>
                 <Edit2 size={16} className="text-gray-300"/>
              </div>
            )}
         </div>

         {/* Meta Financeira (Editável) */}
         <div className="bg-white p-4 rounded-2xl border border-gray-100">
            {editingField === 'goal' ? (
              <div className="flex gap-2 items-center">
                <input autoFocus type="number" value={tempValue} onChange={e=>setTempValue(e.target.value)} className="w-full p-2 border rounded-lg" />
                <button onClick={saveField} className="bg-emerald-600 text-white p-2 rounded-lg"><Check size={18}/></button>
              </div>
            ) : (
              <div onClick={() => handleEdit('goal')} className="flex items-center justify-between cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="bg-amber-50 p-3 rounded-full text-amber-600"><Target size={20}/></div>
                    <div>
                       <p className="font-bold text-gray-800 text-sm">Meta Financeira</p>
                       <p className="text-xs text-gray-400">{formatCurrency(settings.financialGoal)}</p>
                    </div>
                 </div>
                 <Edit2 size={16} className="text-gray-300"/>
              </div>
            )}
         </div>

         {/* Categorias e Limites */}
         <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
             <div onClick={() => setShowCats(!showCats)} className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                   <div className="bg-rose-50 p-3 rounded-full text-rose-600"><AlertCircle size={20}/></div>
                   <div>
                      <p className="font-bold text-gray-800 text-sm">Categorias e Limites</p>
                      <p className="text-xs text-gray-400">{categories.length} ativas</p>
                   </div>
                </div>
                <ChevronRight size={16} className={`text-gray-300 transition-transform ${showCats ? 'rotate-90' : ''}`}/>
             </div>
             
             {showCats && (
               <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2">
                 <div className="flex gap-2 mb-3 mt-3">
                   <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nova categoria..." className="flex-1 p-2 rounded-lg border text-sm"/>
                   <button onClick={() => { if(newCat) { onAddCategory(newCat); setNewCat(''); }}} className="bg-emerald-600 text-white p-2 rounded-lg"><Plus size={18}/></button>
                 </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                   {categories.map((c:string) => (
                     <div key={c} className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                       <span className="font-bold text-gray-700">{c}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Limite:</span>
                          <input 
                            type="number" 
                            placeholder="R$ 0"
                            className="w-20 p-1 border rounded text-right text-xs"
                            value={settings.categoryLimits?.[c] || ''}
                            onChange={(e) => updateCategoryLimit(c, e.target.value)}
                          />
                          <button onClick={() => onDeleteCategory(c)} className="text-gray-300 hover:text-rose-500 ml-1"><Trash2 size={14}/></button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
         </div>
      </div>

      <button onClick={onLogout} className="w-full py-4 text-rose-500 font-bold bg-rose-50 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors mt-6">
         <LogOut size={18} /> Sair da Conta
      </button>
    </div>
  );
};

// --- TELA: NOVA TRANSAÇÃO (COM SISTEMA DE ALERTA INTELIGENTE) ---
const AddTransaction = ({ onSave, onCancel, categories, cards, settings, currentMonthExpenses, monthDetails }: any) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(categories[0]);
  const [type, setType] = useState<'Entrada' | 'Saída'>('Saída');
  const [method, setMethod] = useState<'Dinheiro' | 'Cartão'>('Dinheiro');
  const [selectedCard, setSelectedCard] = useState(cards[0]?.id || '');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados de Alerta
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessages, setAlertMessages] = useState<string[]>([]);

  const checkBudgets = () => {
    const val = parseFloat(amount.replace(',', '.'));
    if(!val) return;
    const messages = [];

    // 1. Verificar Limite da Categoria
    if (type === 'Saída') {
        const catLimit = settings.categoryLimits?.[cat] || 0;
        // Precisamos somar quanto já gastou nessa categoria no mês
        // (Aqui uma simplificação, idealmente receberiamos o total gasto por cat como prop)
        // Se o limite for > 0 e (gastoAtual + val) > limite -> Alerta
        if (catLimit > 0) {
            // Lógica simplificada: avisar apenas se o valor da compra for alto em relação ao limite
             if(val > catLimit) messages.push(`Esta compra excede o limite definido para ${cat} (R$ ${formatCurrency(catLimit)}).`);
        }

    // 2. Verificar Meta Global
        const projectedExpenses = monthDetails.expenses + val;
        const remainingBudget = settings.monthlyIncome - settings.financialGoal;
        
        if (projectedExpenses > remainingBudget) {
            messages.push(`Atenção: Com esta despesa, você pode não atingir sua meta de economia mensal.`);
        }
    }

    if (messages.length > 0) {
        setAlertMessages(messages);
        setShowAlert(true);
    } else {
        confirmSave();
    }
  };

  const confirmSave = () => {
    const val = parseFloat(amount.replace(',', '.'));
    if(!val || !desc) return;

    if (type === 'Saída' && method === 'Cartão' && installments > 1) {
       const parentId = generateId();
       const batch = [];
       const baseDate = new Date(date);
       for(let i = 0; i < installments; i++) {
          const currentInstDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
          batch.push({
            id: generateId(),
            description: `${desc} (${i+1}/${installments})`,
            amount: val / installments,
            type, category: cat, date: currentInstDate.toISOString().split('T')[0],
            month: currentInstDate.toISOString().slice(0, 7),
            paymentMethod: method, cardId: selectedCard,
            installment: { current: i+1, total: installments }, parentId
          });
       }
       onSave(batch);
    } else {
       onSave([{
         id: generateId(), description: desc, amount: val, type, category: cat,
         date: date, month: date.slice(0, 7), paymentMethod: method,
         cardId: method === 'Cartão' ? selectedCard : undefined
       }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      
      {/* Modal de Alerta Inteligente */}
      {showAlert && (
          <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                  <div className="flex justify-center mb-4">
                      <div className="bg-amber-100 p-4 rounded-full text-amber-600"><AlertTriangle size={32}/></div>
                  </div>
                  <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Atenção ao Orçamento</h3>
                  <div className="space-y-2 mb-6">
                      {alertMessages.map((msg, idx) => (
                          <p key={idx} className="text-sm text-gray-600 text-center bg-gray-50 p-2 rounded-lg border border-gray-200">{msg}</p>
                      ))}
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setShowAlert(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">Revisar</button>
                      <button onClick={confirmSave} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200">Confirmar Mesmo Assim</button>
                  </div>
              </div>
          </div>
      )}

      <div className="p-4 flex justify-between items-center border-b">
        <button onClick={onCancel} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
        <h2 className="font-bold text-lg">Nova Transação</h2>
        <div className="w-9" />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); checkBudgets(); }} className="p-6 space-y-6 flex-1 overflow-y-auto pb-24">
        <div>
           <label className="text-xs font-bold text-gray-400 uppercase">Valor Total</label>
           <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
             className="w-full text-5xl font-bold text-gray-800 placeholder-gray-200 focus:outline-none py-2" placeholder="0,00" autoFocus />
        </div>
        <div className="flex p-1 bg-gray-100 rounded-xl">
          <button type="button" onClick={() => setType('Saída')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Saída' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Despesa</button>
          <button type="button" onClick={() => setType('Entrada')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Entrada' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Receita</button>
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
           <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" placeholder="Ex: Mercado" />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
        </div>
        {type === 'Saída' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
             <label className="text-xs font-bold text-gray-400 uppercase">Pagamento</label>
             <div className="flex gap-2">
               <button type="button" onClick={() => setMethod('Dinheiro')} className={`flex-1 p-3 rounded-xl border ${method === 'Dinheiro' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-gray-200 text-gray-500'}`}>Dinheiro/Pix</button>
               <button type="button" onClick={() => setMethod('Cartão')} className={`flex-1 p-3 rounded-xl border ${method === 'Cartão' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-gray-200 text-gray-500'}`}>Cartão</button>
             </div>
             {method === 'Cartão' && (
               <div className="space-y-4 animate-in fade-in">
                 <select value={selectedCard} onChange={e => setSelectedCard(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none">
                     {cards.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.holder})</option>)}
                 </select>
                 <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none">
                     <option value={1}>À vista (1x)</option>
                     {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                 </select>
               </div>
             )}
          </div>
        )}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c: string) => (
               <button key={c} type="button" onClick={() => setCat(c)} 
                 className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${cat === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                 {c}
               </button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200">Confirmar</button>
      </form>
    </div>
  );
};

// --- 4. APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<UserSettings>({ monthlyIncome: 5000, financialGoal: 1000, darkMode: false, categoryLimits: {} });
  
  const [screen, setScreen] = useState<AppScreen>(AppScreen.Home);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const selectedMonthKey = getMonthKey(currentDate);
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if(u) {
        onSnapshot(query(collection(db, `users/${u.uid}/transactions`)), (snap) => {
          const data = snap.docs.map(d => d.data() as Transaction);
          data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRawTransactions(data);
        });
        onSnapshot(doc(db, `users/${u.uid}/settings`, 'cards'), (snap) => {
           if(snap.exists() && snap.data().list) setCards(snap.data().list);
        });
        onSnapshot(doc(db, `users/${u.uid}/settings`, 'config'), (snap) => {
           if(snap.exists()) {
             const d = snap.data();
             if(d.categories) setCategories(d.categories);
             if(d.userSettings) setSettings(d.userSettings);
           }
        });
      }
    });
  }, []);

  const filteredTransactions = useMemo(() => rawTransactions.filter(t => t.month === selectedMonthKey), [rawTransactions, selectedMonthKey]);
  const monthDetails = useMemo(() => {
    let inc = 0, exp = 0;
    filteredTransactions.forEach(t => t.type === 'Entrada' ? inc += t.amount : exp += t.amount);
    return { income: inc, expenses: exp, balance: inc - exp };
  }, [filteredTransactions]);

  const handleLogin = async (e:any) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); } catch(e) { alert("Erro ao entrar."); } };
  
  const addTransactions = async (newTrans: Transaction[]) => {
    if(!user) return;
    const batch = writeBatch(db);
    newTrans.forEach(t => batch.set(doc(db, `users/${user.uid}/transactions`, t.id), t));
    await batch.commit();
    setScreen(AppScreen.Home);
  };

  const deleteTransaction = async (id: string) => {
    if(!user || !confirm('Excluir transação?')) return;
    await deleteDoc(doc(db, `users/${user.uid}/transactions`, id));
  };

  const updateSettings = async (newSettings: UserSettings) => {
     if(!user) return;
     setSettings(newSettings);
     await setDoc(doc(db, `users/${user.uid}/settings`, 'config'), { userSettings: newSettings }, { merge: true });
  };

  const updateCategories = async (newCats: string[]) => {
    if(!user) return;
    setCategories(newCats);
    await setDoc(doc(db, `users/${user.uid}/settings`, 'config'), { categories: newCats }, { merge: true });
  };

  const saveCard = async (updatedCard: CardData) => {
    if(!user) return;
    const exists = cards.find(c => c.id === updatedCard.id);
    const newList = exists ? cards.map(c => c.id === updatedCard.id ? updatedCard : c) : [...cards, updatedCard];
    setCards(newList);
    await setDoc(doc(db, `users/${user.uid}/settings`, 'cards'), { list: newList }, { merge: true });
  };

  const changeMonth = (idx: number) => setCurrentDate(new Date(currentYear, idx, 1));
  const changeYear = (dir: number) => setCurrentDate(new Date(currentYear + dir, currentMonthIdx, 1));

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
          <div className="flex justify-center mb-8"><div className="bg-emerald-50 p-4 rounded-full"><LogIn size={32} className="text-emerald-600" /></div></div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Finanças Casal</h1>
          <p className="text-center text-gray-500 text-xs mb-8 uppercase tracking-wide">Acesse sua conta</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email</label>
               <input type="email" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 focus:border-emerald-500 transition-colors" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Senha</label>
               <input type="password" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 focus:border-emerald-500 transition-colors" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all mt-4">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden relative font-sans">
      {screen !== AppScreen.Add && (
        <div className="bg-white pt-10 pb-2 shadow-sm z-10 rounded-b-[32px]">
           <div className="flex items-center justify-center gap-6 mb-4">
              <button onClick={() => changeYear(-1)} className="p-2 text-gray-400 hover:text-emerald-600"><ChevronLeft size={20}/></button>
              <h2 className="text-xl font-bold text-gray-800">{currentYear}</h2>
              <button onClick={() => changeYear(1)} className="p-2 text-gray-400 hover:text-emerald-600"><ChevronRight size={20}/></button>
           </div>
           <div className="flex overflow-x-auto px-6 gap-3 pb-4 scrollbar-hide">
              {MONTHS.map((m, idx) => (
                 <button key={m} onClick={() => changeMonth(idx)} 
                   className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${idx === currentMonthIdx ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                   {m}
                 </button>
              ))}
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
        {screen === AppScreen.Home && <Home transactions={filteredTransactions} monthDetails={monthDetails} onDelete={deleteTransaction} />}
        {screen === AppScreen.Reports && <Reports transactions={filteredTransactions} categories={categories} />}
        {screen === AppScreen.Cards && <CardsScreen cards={cards} transactions={rawTransactions} currentMonthKey={selectedMonthKey} onSaveCard={saveCard} />}
        {screen === AppScreen.Profile && <Profile user={user} categories={categories} settings={settings} onUpdateSettings={updateSettings} onAddCategory={(c:string)=>updateCategories([...categories,c])} onDeleteCategory={(c:string)=>updateCategories(categories.filter(x=>x!==c))} onLogout={()=>signOut(auth)} monthlySavings={monthDetails.balance} />}
      </div>

      {screen !== AppScreen.Add && (
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-2 pb-6 flex justify-between items-center px-8 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <button onClick={() => setScreen(AppScreen.Home)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Home ? 'text-emerald-600' : 'text-gray-300'}`}><LayoutDashboard size={24} strokeWidth={screen===AppScreen.Home?2.5:2} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setScreen(AppScreen.Cards)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Cards ? 'text-emerald-600' : 'text-gray-300'}`}><CreditCard size={24} strokeWidth={screen===AppScreen.Cards?2.5:2} /><span className="text-[10px] font-bold">Cartões</span></button>
          <div className="relative -top-8"><button onClick={() => setScreen(AppScreen.Add)} className="bg-emerald-600 text-white w-14 h-14 rounded-full shadow-xl shadow-emerald-200 flex items-center justify-center hover:scale-105 transition-transform"><Plus size={32}/></button></div>
          <button onClick={() => setScreen(AppScreen.Reports)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Reports ? 'text-emerald-600' : 'text-gray-300'}`}><PieChartIcon size={24} strokeWidth={screen===AppScreen.Reports?2.5:2} /><span className="text-[10px] font-bold">Relatórios</span></button>
          <button onClick={() => setScreen(AppScreen.Profile)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Profile ? 'text-emerald-600' : 'text-gray-300'}`}><UserIcon size={24} strokeWidth={screen===AppScreen.Profile?2.5:2} /><span className="text-[10px] font-bold">Perfil</span></button>
        </div>
      )}

      {screen === AppScreen.Add && <AddTransaction categories={categories} cards={cards} settings={settings} monthDetails={monthDetails} onSave={addTransactions} onCancel={() => setScreen(AppScreen.Home)} />}
    </div>
  );
}