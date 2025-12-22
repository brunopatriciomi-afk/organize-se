import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  LayoutDashboard, CreditCard, PieChart as PieChartIcon, User as UserIcon, 
  Plus, ChevronLeft, ChevronRight, Wallet, ArrowUpCircle, ArrowDownCircle, 
  Trash2, Edit2, X, Loader2, LogIn, LogOut, Filter, Settings, Target, DollarSign, AlertCircle, Check, AlertTriangle, Moon, Sun, List, CalendarOff, ArchiveX, Zap
} from 'lucide-react';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, onAuthStateChanged, signOut, type User 
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';

// --- 1. TIPOS ---
export enum AppScreen { Home, Reports, Cards, Profile, Add }

export interface UserSettings {
  monthlyIncome: number;
  financialGoal: number;
  darkMode: boolean;
  categoryLimits: Record<string, number>;
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
  { id: 'card_nubank', name: 'Nubank', holder: 'Bruno', limit: 5000, closingDay: 1, dueDay: 8, color: 'border-l-purple-600' },
  { id: 'card_inter', name: 'Inter', holder: 'Carla', limit: 3000, closingDay: 10, dueDay: 17, color: 'border-l-orange-500' },
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
const Home = ({ transactions, monthDetails, onSelectTransaction, darkMode }: any) => {
  return (
    <div className="space-y-6 p-4 pb-32">
      <div className={`rounded-[32px] p-6 shadow-xl relative overflow-hidden transition-colors ${darkMode ? 'bg-emerald-900 text-white' : 'bg-emerald-600 text-white'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120} /></div>
        <p className="text-emerald-100 font-medium mb-1 text-sm">Saldo em Conta</p>
        <h1 className="text-4xl font-bold mb-8">{formatCurrency(monthDetails.balance)}</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl flex-1 backdrop-blur-sm">
            <div className="p-1.5 bg-emerald-400/20 rounded-full"><ArrowUpCircle size={18} className="text-emerald-200"/></div>
            <div>
              <p className="text-[10px] uppercase text-emerald-200 font-bold tracking-wider">Entradas</p>
              <p className="font-bold text-sm">{formatCurrency(monthDetails.income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl flex-1 backdrop-blur-sm">
            <div className="p-1.5 bg-rose-400/20 rounded-full"><ArrowDownCircle size={18} className="text-rose-200"/></div>
            <div>
              <p className="text-[10px] uppercase text-rose-200 font-bold tracking-wider">Saídas</p>
              <p className="font-bold text-sm">{formatCurrency(monthDetails.expenses)}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className={`text-lg font-bold mb-4 px-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Histórico (Últimos Lançamentos)</h2>
        <div className="space-y-3">
          {transactions.slice(0, 20).map((t: Transaction) => {
             const displayAmount = t.installment ? t.amount * t.installment.total : t.amount;
             return (
              <div onClick={() => onSelectTransaction(t, 'home')} key={t.id} className={`group flex justify-between items-center p-4 rounded-2xl shadow-sm border transition-all cursor-pointer active:scale-95 ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-50 hover:border-emerald-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${t.type === 'Entrada' ? (darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600') : (darkMode ? 'bg-rose-900/50 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>
                    {t.type === 'Entrada' ? <ArrowUpCircle size={20}/> : <ArrowDownCircle size={20}/>}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {t.category} • {formatDate(t.date)}
                      </p>
                      {t.installment && (
                        <span className="text-blue-500 font-bold bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[10px]">
                          {t.installment.current}/{t.installment.total}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${t.type === 'Entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'Saída' ? '-' : '+'}{formatCurrency(displayAmount)}
                  </p>
                  {t.installment && <p className="text-[10px] text-gray-400">Total da compra</p>}
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">Nenhuma movimentação neste mês.</p>}
        </div>
      </div>
    </div>
  );
};

// --- TELA: RELATÓRIOS ---
const Reports = ({ transactions, categories, darkMode, onSelectTransaction }: any) => {
  const [filterType, setFilterType] = useState('Saída');
  const [filterCat, setFilterCat] = useState('Todas');

  const data = useMemo(() => {
    let filtered = transactions.filter((t:any) => t.type === filterType);
    if(filterCat !== 'Todas') filtered = filtered.filter((t:any) => t.category === filterCat);
    const map = new Map();
    filtered.forEach((t: any) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [transactions, filterType, filterCat]);

  const detailedList = useMemo(() => {
    let list = transactions.filter((t:any) => t.type === filterType);
    if(filterCat !== 'Todas') list = list.filter((t:any) => t.category === filterCat);
    return list;
  }, [transactions, filterType, filterCat]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="p-4 pb-32">
      <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Relatórios</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
         <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}><Filter size={14} className="text-gray-400"/></div>
         <select value={filterType} onChange={e=>setFilterType(e.target.value)} className={`px-4 py-2 rounded-xl border text-sm font-bold outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-600'}`}>
            <option value="Saída">Despesas</option>
            <option value="Entrada">Receitas</option>
         </select>
         <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className={`px-4 py-2 rounded-xl border text-sm font-bold outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-600'}`}>
            <option value="Todas">Todas Categorias</option>
            {categories.map((c:string) => <option key={c} value={c}>{c}</option>)}
         </select>
      </div>

      {data.length > 0 ? (
        <>
          <div className={`p-6 rounded-[32px] shadow-sm border h-80 mb-6 relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{backgroundColor: darkMode ? '#1f2937' : '#fff', borderColor: darkMode ? '#374151' : '#e5e7eb', color: darkMode ? '#fff' : '#000'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(data.reduce((acc:number, curr:any) => acc + curr.value, 0))}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
             <List size={18} className="text-gray-400"/>
             <h3 className={`font-bold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Extrato Detalhado</h3>
          </div>
          
          <div className="space-y-2">
            {detailedList.map((t: Transaction) => (
              <div onClick={() => onSelectTransaction(t, 'reports')} key={t.id} className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer active:opacity-70 ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-50 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                        {t.type === 'Entrada' ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>}
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t.description}</p>
                        <p className="text-xs text-gray-400">{t.category} • {formatDate(t.date)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(t.amount)}</span>
                    {t.installment && <p className="text-[10px] text-blue-500 font-bold">Parcela {t.installment.current}/{t.installment.total}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={`p-10 rounded-[32px] text-center border border-dashed mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
           <p className="text-gray-400 text-sm">Sem dados para este período.</p>
        </div>
      )}
    </div>
  );
};

// --- MODAL DE EDIÇÃO AVANÇADA / ANTECIPAÇÃO ---
const EditTransactionModal = ({ transaction, mode, onClose, onRewrite, onAnticipate, onDelete, categories, cards, darkMode }: any) => {
  const [desc, setDesc] = useState(transaction.description);
  const [cat, setCat] = useState(transaction.category);
  const [date, setDate] = useState(transaction.date);
  
  // Estados para edição complexa
  const [amount, setAmount] = useState(transaction.amount); 
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro'|'Cartão'>(transaction.paymentMethod);
  const [selectedCard, setSelectedCard] = useState(transaction.cardId || cards[0]?.id || '');
  const [installments, setInstallments] = useState(transaction.installment?.total || 1);

  // Carregar dados iniciais
  useEffect(() => {
     if (transaction.installment) {
         // Se for parcelado, sempre mostra o TOTAL para edição
         setAmount(transaction.amount * transaction.installment.total);
     } else {
         setAmount(transaction.amount);
     }
  }, [transaction]);

  const handleSave = () => {
    const finalAmount = Number(amount);
    
    // Verifica se houve mudança estrutural (forma pagto ou parcelas)
    const isStructuralChange = 
        paymentMethod !== transaction.paymentMethod ||
        (paymentMethod === 'Cartão' && installments !== (transaction.installment?.total || 1)) ||
        (paymentMethod === 'Cartão' && selectedCard !== transaction.cardId);

    if (isStructuralChange) {
        // Precisa reescrever (apagar tudo e criar novo)
        if(confirm('Você alterou a forma de pagamento ou parcelamento. Isso irá recriar todas as transações relacionadas. Continuar?')) {
            onRewrite(transaction, {
                description: desc,
                amount: finalAmount,
                category: cat,
                date: date,
                paymentMethod,
                cardId: selectedCard,
                installments
            });
            onClose();
        }
    } else {
        // Edição simples
        let saveAmount = finalAmount;
        if (transaction.installment) {
            saveAmount = finalAmount / transaction.installment.total; // Volta para valor da parcela
        }
        onRewrite(transaction, { ...transaction, description: desc, amount: saveAmount, category: cat, date, cardId: selectedCard }, true); // true = simple update
        onClose();
    }
  };

  const handleAnticipateClick = () => {
      if(confirm('Deseja ANTECIPAR todas as parcelas futuras?\n\nIsso somará o valor restante e criará uma única despesa para HOJE, apagando as cobranças dos meses seguintes.')) {
          onAnticipate(transaction);
          onClose();
      }
  };

  const handleDeleteAll = () => {
      if(confirm('Excluir este registro? Se for parcelado, apagará TODAS as parcelas (correção de cadastro).')) {
        onDelete(transaction); 
        onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
       <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-lg">Editar Detalhes</h3>
             <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
          </div>
          
          <div className="space-y-4">
             <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Total</label>
               <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className={`w-full p-3 rounded-xl border font-bold text-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`} />
             </div>
             
             {/* Seletor de Método de Pagamento */}
             <div>
                 <label className="text-[10px] font-bold text-gray-400 uppercase">Pagamento</label>
                 <div className="flex gap-2 mt-1">
                    <button onClick={()=>setPaymentMethod('Dinheiro')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${paymentMethod==='Dinheiro' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-400'}`}>Dinheiro/Pix</button>
                    <button onClick={()=>setPaymentMethod('Cartão')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${paymentMethod==='Cartão' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-400'}`}>Cartão</button>
                 </div>
             </div>

             {paymentMethod === 'Cartão' && (
                 <div className="flex gap-2 animate-in fade-in">
                     <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Cartão</label>
                        <select value={selectedCard} onChange={e=>setSelectedCard(e.target.value)} className={`w-full p-2 rounded-xl border text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                            {cards.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="w-24">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Parcelas</label>
                        <select value={installments} onChange={e=>setInstallments(Number(e.target.value))} className={`w-full p-2 rounded-xl border text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                            {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => <option key={n} value={n}>{n}x</option>)}
                        </select>
                     </div>
                 </div>
             )}

             <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
               <input value={desc} onChange={e=>setDesc(e.target.value)} className={`w-full p-3 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`} />
             </div>
             <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
               <input type="date" value={date} onChange={e=>setDate(e.target.value)} className={`w-full p-3 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`} />
             </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
             <button onClick={handleSave} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200">Salvar Alterações</button>
             
             {/* BOTÃO DE ANTECIPAR (Só aparece se for parcelado e Cartão) */}
             {transaction.installment && transaction.installment.current < transaction.installment.total && (
                 <button onClick={handleAnticipateClick} className="w-full py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100">
                    <Zap size={18}/> Antecipar Parcelas Restantes
                 </button>
             )}

             <button onClick={handleDeleteAll} className="w-full py-3 bg-rose-50 text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-100">
                <Trash2 size={18}/> Excluir Registro (Erro)
             </button>
          </div>
       </div>
    </div>
  );
};

// --- (CardsScreen e Profile permanecem iguais) ---
const CardsScreen = ({ cards, transactions, currentMonthKey, onSaveCard, onDeleteCard, darkMode }: any) => {
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
  
  const confirmDeleteCard = () => {
    if(confirm('Tem certeza? Isso apagará este cartão e todas as configurações dele.')) onDeleteCard(activeCard.id);
  }

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
       <div className={`p-4 pb-32 space-y-6 min-h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
         <div className="flex items-center justify-between">
            <button onClick={() => setSelectedCardId(null)} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-white text-gray-600'}`}><ChevronLeft size={24}/></button>
            <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>{activeCard.name} ({activeCard.holder})</h2>
            <button onClick={startEditing} className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-white text-gray-600'}`}><Edit2 size={20}/></button>
         </div>

         {isEditing && (
           <div className={`p-4 rounded-2xl shadow-lg border space-y-3 animate-in fade-in ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Editar Cartão</h3>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Nome do Cartão</label>
                <input value={editName} onChange={e=>setEditName(e.target.value)} className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Titular (Nome)</label>
                <input value={editHolder} onChange={e=>setEditHolder(e.target.value)} placeholder="Ex: Bruno" className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 text-gray-500 font-bold text-xs">Cancelar</button>
                <button onClick={saveEdit} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs">Salvar</button>
              </div>
              <button onClick={confirmDeleteCard} className="w-full py-2 bg-rose-50 text-rose-500 rounded-lg font-bold text-xs mt-2 border border-rose-100 hover:bg-rose-100">Excluir Cartão</button>
           </div>
         )}

         <div className={`rounded-[24px] p-6 shadow-sm border text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-4">
               <CreditCard size={18} className="text-emerald-500"/>
               <span className="text-emerald-500 font-bold text-xs uppercase tracking-widest">FATURA — {monthName.toUpperCase()}</span>
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(currentInvoice)}</h1>
            <p className="text-xs text-gray-400 mb-8">Total da Fatura</p>

            <div className={`flex justify-between border-t pt-6 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Fecha em</p>
                  <p className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{activeCard.closingDay.toString().padStart(2,'0')}/{mStr}</p>
                </div>
                <div className={`w-px mx-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}></div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 text-rose-500">Vence em</p>
                  <p className="font-bold text-rose-500">{activeCard.dueDay.toString().padStart(2,'0')}/{mStr}</p>
                </div>
            </div>
         </div>

         <div>
            <h3 className={`font-bold mb-4 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Próximas Faturas</h3>
            <div className="space-y-3">
               {futureInvoices.every(i => i.total === 0) ? (
                 <div className={`border-2 border-dashed rounded-2xl p-6 text-center text-sm ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                   Nenhuma fatura futura prevista.
                 </div>
               ) : (
                 futureInvoices.map(inv => (
                   <div key={inv.key} className={`flex justify-between items-center p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                      <span className="font-bold text-gray-500 uppercase text-xs">{inv.label}</span>
                      <span className={`font-bold ${inv.total > 0 ? (darkMode ? 'text-gray-200' : 'text-gray-800') : 'text-gray-300'}`}>{inv.total > 0 ? formatCurrency(inv.total) : '-'}</span>
                   </div>
                 ))
               )}
            </div>
         </div>
       </div>
    );
  }

  return (
    <div className={`p-4 pb-32 space-y-6 ${darkMode ? 'text-white' : ''}`}>
      <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Meus Cartões</h2>
      <div className="space-y-4">
        {cards.map((card: CardData) => {
           const invoice = getInvoiceTotal(card.id, currentMonthKey);
           const limitUsedPercent = Math.min((invoice / card.limit) * 100, 100);
           
           return (
             <div key={card.id} onClick={() => setSelectedCardId(card.id)} 
               className={`rounded-2xl p-5 shadow-sm border border-l-4 cursor-pointer hover:shadow-md transition-all relative overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} ${card.color || 'border-l-emerald-500'}`}
             >
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><CreditCard size={20}/></div>
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{card.name} ({card.holder})</h3>
                        <p className="text-xs text-gray-400">{card.holder}</p>
                      </div>
                   </div>
                   <ChevronRight size={20} className="text-gray-300"/>
                </div>
                <div>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Limite Disponível</span>
                      <span className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatCurrency(card.limit - invoice)}</span>
                   </div>
                   <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="h-full bg-emerald-500 rounded-full" style={{width: `${100 - limitUsedPercent}%`}}></div>
                   </div>
                </div>
             </div>
           );
        })}
      </div>
      <button onClick={() => onSaveCard({ id: generateId(), name: 'Novo Cartão', holder: 'Titular', limit: 1000, closingDay: 1, dueDay: 10, color: 'border-l-gray-500' })} 
        className={`w-full py-4 border-2 border-dashed rounded-2xl font-bold transition-colors ${darkMode ? 'border-gray-700 text-gray-500 hover:border-emerald-500 hover:text-emerald-500' : 'border-gray-300 text-gray-400 hover:bg-gray-50 hover:border-emerald-500 hover:text-emerald-500'}`}>
        + Adicionar Novo Cartão
      </button>
    </div>
  );
};
const Profile = ({ user, categories, settings, onUpdateSettings, onAddCategory, onDeleteCategory, onLogout, monthlySavings, darkMode }: any) => {
  const [showCats, setShowCats] = useState(false);
  const [newCat, setNewCat] = useState('');
  
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

  const toggleDarkMode = () => {
    onUpdateSettings({ ...settings, darkMode: !settings.darkMode });
  };

  return (
    <div className="p-4 pb-32 space-y-6">
      <div className="flex justify-between items-center">
         <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Perfil</h2>
         <div onClick={toggleDarkMode} className={`p-2 rounded-full cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-500'}`}>
            {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
         </div>
      </div>

      <div className={`rounded-3xl p-6 text-white shadow-lg relative overflow-hidden ${darkMode ? 'bg-emerald-900' : 'bg-emerald-500'}`}>
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
         {/* Renda Mensal */}
         <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {editingField === 'income' ? (
              <div className="flex gap-2 items-center">
                <input autoFocus type="number" value={tempValue} onChange={e=>setTempValue(e.target.value)} className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} />
                <button onClick={saveField} className="bg-emerald-600 text-white p-2 rounded-lg"><Check size={18}/></button>
              </div>
            ) : (
              <div onClick={() => handleEdit('income')} className="flex items-center justify-between cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Wallet size={20}/></div>
                    <div>
                       <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Renda Mensal</p>
                       <p className="text-xs text-gray-400">{formatCurrency(settings.monthlyIncome)}</p>
                    </div>
                 </div>
                 <Edit2 size={16} className="text-gray-300"/>
              </div>
            )}
         </div>

         {/* Meta Financeira */}
         <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            {editingField === 'goal' ? (
              <div className="flex gap-2 items-center">
                <input autoFocus type="number" value={tempValue} onChange={e=>setTempValue(e.target.value)} className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} />
                <button onClick={saveField} className="bg-emerald-600 text-white p-2 rounded-lg"><Check size={18}/></button>
              </div>
            ) : (
              <div onClick={() => handleEdit('goal')} className="flex items-center justify-between cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><Target size={20}/></div>
                    <div>
                       <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Meta Financeira</p>
                       <p className="text-xs text-gray-400">{formatCurrency(settings.financialGoal)}</p>
                    </div>
                 </div>
                 <Edit2 size={16} className="text-gray-300"/>
              </div>
            )}
         </div>

         {/* Categorias e Limites */}
         <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
             <div onClick={() => setShowCats(!showCats)} className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-full ${darkMode ? 'bg-rose-900/50 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><AlertCircle size={20}/></div>
                   <div>
                      <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Categorias e Limites</p>
                      <p className="text-xs text-gray-400">{categories.length} ativas</p>
                   </div>
                </div>
                <ChevronRight size={16} className={`text-gray-300 transition-transform ${showCats ? 'rotate-90' : ''}`}/>
             </div>
             
             {showCats && (
               <div className={`px-4 pb-4 border-t animate-in slide-in-from-top-2 ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                 <div className="flex gap-2 mb-3 mt-3">
                   <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Nova categoria..." className={`flex-1 p-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}/>
                   <button onClick={() => { if(newCat) { onAddCategory(newCat); setNewCat(''); }}} className="bg-emerald-600 text-white p-2 rounded-lg"><Plus size={18}/></button>
                 </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                   {categories.map((c:string) => (
                     <div key={c} className={`flex justify-between items-center text-sm p-3 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                       <span className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{c}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Limite:</span>
                          <input 
                            type="number" 
                            placeholder="R$ 0"
                            className={`w-20 p-1 border rounded text-right text-xs ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
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

      <button onClick={onLogout} className={`w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors mt-6 ${darkMode ? 'text-rose-400 bg-rose-900/20 hover:bg-rose-900/30' : 'text-rose-500 bg-rose-50 hover:bg-rose-100'}`}>
         <LogOut size={18} /> Sair da Conta
      </button>
    </div>
  );
};

// --- TELA: NOVA TRANSAÇÃO (CORRIGIDA E BLINDADA) ---
const AddTransaction = ({ onSave, onCancel, categories, cards, settings, monthDetails, darkMode }: any) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(categories[0] || 'Geral');
  const [type, setType] = useState<'Entrada' | 'Saída'>('Saída');
  const [method, setMethod] = useState<'Dinheiro' | 'Cartão'>('Dinheiro');
  const [selectedCard, setSelectedCard] = useState(cards[0]?.id || '');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessages, setAlertMessages] = useState<string[]>([]);

  // Converte valor string (com virgula ou ponto) para float com segurança
  const parseAmount = (val: string) => {
    if (!val) return 0;
    const cleanVal = val.replace(',', '.').replace(/[^0-9.]/g, ''); 
    const result = parseFloat(cleanVal);
    return isNaN(result) ? 0 : result;
  };

  const checkBudgets = () => {
    const val = parseAmount(amount);
    
    if (val <= 0) {
        alert("Por favor, insira um valor válido maior que zero.");
        return;
    }
    if (!desc.trim()) {
        alert("Por favor, dê um nome para a transação.");
        return;
    }

    const messages = [];

    if (type === 'Saída') {
        const catLimit = settings?.categoryLimits?.[cat] || 0;
        if (catLimit > 0 && val > catLimit) {
             messages.push(`Esta compra excede o limite de ${cat} (R$ ${formatCurrency(catLimit)}).`);
        }
    }

    if (messages.length > 0) {
        setAlertMessages(messages);
        setShowAlert(true);
    } else {
        confirmSave();
    }
  };

  const confirmSave = async () => {
    setIsSaving(true);
    try {
        const val = parseAmount(amount);
        
        if (type === 'Saída' && method === 'Cartão' && installments > 1) {
           const parentId = generateId();
           const batch = [];
           const baseDate = new Date(date);
           
           for(let i = 0; i < installments; i++) {
              const currentInstDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate() + 1);
              batch.push({
                id: generateId(),
                description: `${desc} (${i+1}/${installments})`,
                amount: val / installments,
                type, 
                category: cat, 
                date: currentInstDate.toISOString().split('T')[0],
                month: currentInstDate.toISOString().slice(0, 7),
                paymentMethod: method, 
                cardId: selectedCard,
                installment: { current: i+1, total: installments }, 
                parentId
              });
           }
           await onSave(batch);
        } else {
           await onSave([{
             id: generateId(), 
             description: desc, 
             amount: val, 
             type, 
             category: cat,
             date: date, 
             month: date.slice(0, 7), 
             paymentMethod: method,
             cardId: method === 'Cartão' ? selectedCard : undefined
           }]);
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar. Tente novamente.");
        setIsSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col animate-in slide-in-from-bottom duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      
      {showAlert && (
          <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
              <div className={`rounded-3xl p-6 w-full max-w-sm shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex justify-center mb-4">
                      <div className="bg-amber-100 p-4 rounded-full text-amber-600"><AlertTriangle size={32}/></div>
                  </div>
                  <h3 className={`text-xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Atenção ao Orçamento</h3>
                  <div className="space-y-2 mb-6">
                      {alertMessages.map((msg, idx) => (
                          <p key={idx} className={`text-sm text-center p-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{msg}</p>
                      ))}
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => { setShowAlert(false); setIsSaving(false); }} className={`flex-1 py-3 font-bold rounded-xl ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>Revisar</button>
                      <button onClick={() => { setShowAlert(false); confirmSave(); }} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      <div className={`p-4 flex justify-between items-center border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <button onClick={onCancel} className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100'}`}><X size={20}/></button>
        <h2 className="font-bold text-lg">Nova Transação</h2>
        <div className="w-9" />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); checkBudgets(); }} className="p-6 space-y-6 flex-1 overflow-y-auto pb-24">
        <div>
           <label className="text-xs font-bold text-gray-400 uppercase">Valor Total</label>
           <input type="tel" value={amount} onChange={e => setAmount(e.target.value)}
             className={`w-full text-5xl font-bold bg-transparent placeholder-gray-500 focus:outline-none py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`} placeholder="0,00" autoFocus />
        </div>
        <div className={`flex p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button type="button" onClick={() => setType('Saída')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Saída' ? (darkMode ? 'bg-gray-700 text-rose-400' : 'bg-white text-rose-600 shadow-sm') : 'text-gray-400'}`}>Despesa</button>
          <button type="button" onClick={() => setType('Entrada')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Entrada' ? (darkMode ? 'bg-gray-700 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm') : 'text-gray-400'}`}>Receita</button>
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
           <input value={desc} onChange={e => setDesc(e.target.value)} className={`w-full p-3 border rounded-xl outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} placeholder="Ex: Mercado" />
        </div>
        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`w-full p-3 border rounded-xl outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} />
        </div>
        {type === 'Saída' && (
          <div className={`space-y-4 pt-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
             <label className="text-xs font-bold text-gray-400 uppercase">Pagamento</label>
             <div className="flex gap-2">
               <button type="button" onClick={() => setMethod('Dinheiro')} className={`flex-1 p-3 rounded-xl border ${method === 'Dinheiro' ? (darkMode ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold') : (darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500')}`}>Dinheiro/Pix</button>
               <button type="button" onClick={() => setMethod('Cartão')} className={`flex-1 p-3 rounded-xl border ${method === 'Cartão' ? (darkMode ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold') : (darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500')}`}>Cartão</button>
             </div>
             {method === 'Cartão' && (
               <div className="space-y-4 animate-in fade-in">
                 <select value={selectedCard} onChange={e => setSelectedCard(e.target.value)} className={`w-full p-3 border rounded-xl outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
                     {cards.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.holder})</option>)}
                 </select>
                 <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className={`w-full p-3 border rounded-xl outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
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
                 className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${cat === c ? 'bg-emerald-600 text-white border-emerald-600' : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white text-gray-600 border-gray-200')}`}>
                 {c}
               </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={isSaving} className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-200'}`}>
            {isSaving ? 'Salvando...' : 'Confirmar'}
        </button>
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
  
  const [editingTransaction, setEditingTransaction] = useState<{data: Transaction, mode: 'home'|'reports'} | null>(null);

  const selectedMonthKey = getMonthKey(currentDate);
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();

  // --- TRAVA ZOOM NO CELULAR (META TAG + CSS) ---
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
    // Forçar CSS global para evitar comportamento elástico
    document.body.style.touchAction = 'pan-x pan-y';
  }, []);

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

  // Funcao inteligente para reescrever transacoes quando muda a estrutura (ex: 5x para 10x)
  const rewriteTransaction = async (oldT: Transaction, newData: any, isSimpleUpdate = false) => {
     if(!user) return;
     const batch = writeBatch(db);

     // Se for update simples (só mudou nome/data), não precisa deletar e recriar tudo
     if (isSimpleUpdate) {
         batch.update(doc(db, `users/${user.uid}/transactions`, oldT.id), newData);
         await batch.commit();
         return;
     }

     // Se for mudança estrutural (ex: Pix -> Cartão ou Parcelas), deleta o grupo antigo
     if (oldT.parentId) {
        const siblings = rawTransactions.filter(rt => rt.parentId === oldT.parentId);
        siblings.forEach(s => batch.delete(doc(db, `users/${user.uid}/transactions`, s.id)));
     } else {
        batch.delete(doc(db, `users/${user.uid}/transactions`, oldT.id));
     }

     // Cria novas transações baseadas nos novos dados
     if (newData.paymentMethod === 'Cartão' && newData.installments > 1) {
        const parentId = generateId();
        const baseDate = new Date(newData.date);
        for(let i = 0; i < newData.installments; i++) {
            const currentInstDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate() + 1);
            const newId = generateId();
            batch.set(doc(db, `users/${user.uid}/transactions`, newId), {
                id: newId,
                description: `${newData.description} (${i+1}/${newData.installments})`,
                amount: newData.amount / newData.installments,
                type: oldT.type,
                category: newData.category,
                date: currentInstDate.toISOString().split('T')[0],
                month: currentInstDate.toISOString().slice(0, 7),
                paymentMethod: 'Cartão',
                cardId: newData.cardId,
                installment: { current: i+1, total: newData.installments },
                parentId
            });
        }
     } else {
        const newId = generateId();
        batch.set(doc(db, `users/${user.uid}/transactions`, newId), {
            id: newId,
            description: newData.description,
            amount: newData.amount,
            type: oldT.type,
            category: newData.category,
            date: newData.date,
            month: newData.date.slice(0, 7),
            paymentMethod: 'Dinheiro'
        });
     }
     await batch.commit();
  };

  const anticipateTransaction = async (t: Transaction) => {
      if(!user || !t.parentId || !t.installment) return;
      const batch = writeBatch(db);

      // Pega todas as parcelas futuras (incluindo a atual, se quiser quitar agora)
      const currentNum = t.installment.current;
      const futureInstallments = rawTransactions.filter(rt => rt.parentId === t.parentId && rt.installment && rt.installment.current >= currentNum);
      
      // Soma o valor total restante
      const totalRemaining = futureInstallments.reduce((acc, curr) => acc + curr.amount, 0);

      // Deleta as futuras
      futureInstallments.forEach(inst => {
         batch.delete(doc(db, `users/${user.uid}/transactions`, inst.id));
      });

      // Cria uma nova transação consolidada para HOJE
      const newId = generateId();
      const today = new Date().toISOString().split('T')[0];
      
      batch.set(doc(db, `users/${user.uid}/transactions`, newId), {
          id: newId,
          description: `${t.description.split('(')[0]} (Antecipação)`,
          amount: totalRemaining,
          type: 'Saída',
          category: t.category,
          date: today,
          month: today.slice(0, 7),
          paymentMethod: 'Dinheiro', // Geralmente antecipação se paga no ato, ou entra na fatura atual como valor único
          cardId: t.cardId // Mantem no cartão para pagar na fatura atual
      });

      await batch.commit();
  };

  const deleteTransaction = async (t: Transaction) => {
    if(!user) return;
    const batch = writeBatch(db);
    
    // Agora o delete é sempre GLOBAL para corrigir erro, ou seja, apaga tudo
    if (t.installment && t.parentId) {
       const allInstallments = rawTransactions.filter(rt => rt.parentId === t.parentId);
       allInstallments.forEach(inst => {
          batch.delete(doc(db, `users/${user.uid}/transactions`, inst.id));
       });
    } else {
       batch.delete(doc(db, `users/${user.uid}/transactions`, t.id));
    }
    await batch.commit();
  };

  // ... (Funções de Settings, Cards permanecem iguais)
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
  const deleteCard = async (cardId: string) => {
    if(!user) return;
    const newList = cards.filter(c => c.id !== cardId);
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

  const isDark = settings.darkMode;

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden relative font-sans transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {screen !== AppScreen.Add && (
        <div className={`pt-10 pb-2 shadow-sm z-10 rounded-b-[32px] ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
           <div className="flex items-center justify-center gap-6 mb-4">
              <button onClick={() => changeYear(-1)} className={`p-2 hover:text-emerald-500 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}><ChevronLeft size={20}/></button>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{currentYear}</h2>
              <button onClick={() => changeYear(1)} className={`p-2 hover:text-emerald-500 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}><ChevronRight size={20}/></button>
           </div>
           <div className="flex overflow-x-auto px-6 gap-3 pb-4 scrollbar-hide">
              {MONTHS.map((m, idx) => (
                 <button key={m} onClick={() => changeMonth(idx)} 
                   className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${idx === currentMonthIdx ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-400 hover:bg-gray-100')}`}>
                   {m}
                 </button>
              ))}
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
        {screen === AppScreen.Home && <Home transactions={filteredTransactions} monthDetails={monthDetails} onSelectTransaction={(t:any) => setEditingTransaction({data: t, mode: 'home'})} darkMode={isDark} />}
        {screen === AppScreen.Reports && <Reports transactions={filteredTransactions} categories={categories} darkMode={isDark} onSelectTransaction={(t:any) => setEditingTransaction({data: t, mode: 'reports'})} />}
        {screen === AppScreen.Cards && <CardsScreen cards={cards} transactions={rawTransactions} currentMonthKey={selectedMonthKey} onSaveCard={saveCard} onDeleteCard={deleteCard} darkMode={isDark} />}
        {screen === AppScreen.Profile && <Profile user={user} categories={categories} settings={settings} onUpdateSettings={updateSettings} onAddCategory={(c:string)=>updateCategories([...categories,c])} onDeleteCategory={(c:string)=>updateCategories(categories.filter(x=>x!==c))} onLogout={()=>signOut(auth)} monthlySavings={monthDetails.balance} darkMode={isDark} />}
      </div>

      {screen !== AppScreen.Add && (
        <div className={`fixed bottom-0 w-full border-t p-2 pb-6 flex justify-between items-center px-8 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <button onClick={() => setScreen(AppScreen.Home)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Home ? 'text-emerald-500' : 'text-gray-400'}`}><LayoutDashboard size={24} strokeWidth={screen===AppScreen.Home?2.5:2} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setScreen(AppScreen.Cards)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Cards ? 'text-emerald-500' : 'text-gray-400'}`}><CreditCard size={24} strokeWidth={screen===AppScreen.Cards?2.5:2} /><span className="text-[10px] font-bold">Cartões</span></button>
          <div className="relative -top-8"><button onClick={() => setScreen(AppScreen.Add)} className="bg-emerald-600 text-white w-14 h-14 rounded-full shadow-xl shadow-emerald-200 flex items-center justify-center hover:scale-105 transition-transform"><Plus size={32}/></button></div>
          <button onClick={() => setScreen(AppScreen.Reports)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Reports ? 'text-emerald-500' : 'text-gray-400'}`}><PieChartIcon size={24} strokeWidth={screen===AppScreen.Reports?2.5:2} /><span className="text-[10px] font-bold">Relatórios</span></button>
          <button onClick={() => setScreen(AppScreen.Profile)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Profile ? 'text-emerald-500' : 'text-gray-400'}`}><UserIcon size={24} strokeWidth={screen===AppScreen.Profile?2.5:2} /><span className="text-[10px] font-bold">Perfil</span></button>
        </div>
      )}

      {screen === AppScreen.Add && <AddTransaction categories={categories} cards={cards} settings={settings} monthDetails={monthDetails} onSave={addTransactions} onCancel={() => setScreen(AppScreen.Home)} darkMode={isDark} />}
      
      {/* Modal de Edição */}
      {editingTransaction && (
        <EditTransactionModal 
          transaction={editingTransaction.data} 
          mode={editingTransaction.mode}
          categories={categories}
          cards={cards}
          darkMode={isDark}
          onClose={() => setEditingTransaction(null)}
          onRewrite={rewriteTransaction}
          onAnticipate={anticipateTransaction}
          onDelete={deleteTransaction}
        />
      )}
    </div>
  );
}