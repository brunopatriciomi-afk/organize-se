import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Label
} from 'recharts';
import { 
  LayoutDashboard, CreditCard, PieChart as PieChartIcon, User as UserIcon, 
  Plus, ChevronLeft, ChevronRight, ChevronDown, Wallet, ArrowUpCircle, ArrowDownCircle, 
  Trash2, Edit2, X, Loader2, LogIn, LogOut, Filter, Settings, Target, DollarSign, AlertCircle, Check, AlertTriangle, Moon, Sun, List, Zap, TrendingUp, ArrowRightCircle
} from 'lucide-react';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch, where, getDocs 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, onAuthStateChanged, signOut, type User 
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';

// --- 1. TIPOS ---
export enum AppScreen { Home, Reports, Cards, Profile, Add }

export interface Goal { id: string; name: string; amount: number; }

export interface UserSettings {
  monthlyIncome: number;
  goals: Goal[];
  darkMode: boolean;
  categoryLimits: Record<string, number>;
  incomeCategories?: string[];
  investmentCategories?: string[];
  expenseCategories?: string[];
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
  type: 'Entrada' | 'Saída' | 'Investimento';
  category: string;
  date: string;
  month: string;
  paymentMethod: 'Dinheiro' | 'Cartão';
  cardId?: string | null;
  installment?: { current: number; total: number };
  parentId?: string;
  transferId?: string;
}

// Categorias Padrão
const DEFAULT_EXPENSE_CATS = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Compras', 'Serviços', 'Assinaturas'];
const DEFAULT_INCOME_CATS = ['Salário', 'Bônus', 'Dinheiro Extra', 'Reembolso'];
const DEFAULT_INVEST_CATS = ['Reserva', 'Casa', 'Carro', 'Aposentadoria', 'Saldo Inicial'];

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
const getRandomColor = () => {
    const colors = ['#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#6366F1', '#EF4444'];
    return colors[Math.floor(Math.random() * colors.length)];
};

// --- 3. COMPONENTES ---

// --- TELA: HOME ---
const Home = ({ transactions, monthDetails, onSelectTransaction, onTransferBalance, darkMode }: any) => {
  return (
    <div className="space-y-6 p-4 pb-32">
      <div className={`rounded-[32px] p-6 relative overflow-hidden transition-colors ${darkMode ? 'bg-emerald-900 text-white shadow-none' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100/50'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120} /></div>
        <p className="text-emerald-100 font-medium mb-1 text-sm">Saldo em Conta</p>
        <h1 className="text-4xl font-bold mb-8">{formatCurrency(monthDetails.balance)}</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-black/20 px-3 py-3 rounded-2xl flex-1 backdrop-blur-sm min-w-0">
            <div className="p-1.5 bg-emerald-400/20 rounded-full shrink-0"><ArrowUpCircle size={18} className="text-emerald-200"/></div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[9px] uppercase text-emerald-200 font-bold tracking-wider truncate">Entradas</p>
              <p className="font-bold text-sm truncate">{formatCurrency(monthDetails.income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-black/20 px-3 py-3 rounded-2xl flex-1 backdrop-blur-sm min-w-0">
            <div className="p-1.5 bg-rose-400/20 rounded-full shrink-0"><ArrowDownCircle size={18} className="text-rose-200"/></div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-[9px] uppercase text-rose-200 font-bold tracking-wider truncate">Saídas</p>
              <p className="font-bold text-sm truncate">{formatCurrency(monthDetails.expenses)}</p>
            </div>
          </div>
        </div>
        
        {monthDetails.balance > 0 && (
            <button onClick={() => onTransferBalance(monthDetails.balance)} className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 backdrop-blur-sm transition-all">
                <ArrowRightCircle size={16}/> Transferir Sobra para Mês Seguinte
            </button>
        )}
      </div>

      <div>
        <h2 className={`text-lg font-bold mb-4 px-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Histórico (Últimos 5)</h2>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((t: Transaction) => {
             const displayAmount = t.installment ? t.amount * t.installment.total : t.amount;
             let iconColor = t.type === 'Entrada' ? (darkMode ? 'text-emerald-400 bg-emerald-900/50' : 'text-emerald-600 bg-emerald-100') : (darkMode ? 'text-rose-400 bg-rose-900/50' : 'text-rose-600 bg-rose-50');
             let icon = t.type === 'Entrada' ? <ArrowUpCircle size={20}/> : <ArrowDownCircle size={20}/>;
             
             if (t.type === 'Investimento') {
                 iconColor = darkMode ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-100';
                 icon = <TrendingUp size={20}/>;
             }

             return (
              <div onClick={() => onSelectTransaction(t, 'home')} key={t.id} className={`group flex justify-between items-center p-4 rounded-2xl shadow-sm border transition-all cursor-pointer active:scale-95 ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-50 hover:border-emerald-100 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${iconColor}`}>
                    {icon}
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
                  <p className={`font-bold ${t.type === 'Entrada' ? 'text-emerald-500' : (t.type === 'Investimento' ? 'text-blue-500' : 'text-rose-500')}`}>
                    {t.type === 'Entrada' ? '+' : '-'}{formatCurrency(displayAmount)}
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

// --- TELA: RELATÓRIOS (ATUALIZADA) ---
const Reports = ({ transactions, categories, darkMode, onSelectTransaction }: any) => {
  // Estados dos filtros
  const [filterType, setFilterType] = useState<'Tudo' | 'Saída' | 'Entrada' | 'Investimento'>('Tudo');
  const [filterCat, setFilterCat] = useState('Todas');

  // Lógica do Gráfico e Totais
  const reportData = useMemo(() => {
    let chartData = [];
    let centerValue = 0;
    let centerLabel = "";

    // Dados base filtrados (já vem filtrado por mês do componente App)
    const filteredTrans = transactions;

    if (filterType === 'Tudo') {
        // --- VISÃO GERAL (MACRO) ---
        const totalReceita = filteredTrans.filter((t:any) => t.type === 'Entrada').reduce((acc:number, curr:any) => acc + curr.amount, 0);
        const totalDespesa = filteredTrans.filter((t:any) => t.type === 'Saída').reduce((acc:number, curr:any) => acc + curr.amount, 0);
        const totalInvestimento = filteredTrans.filter((t:any) => t.type === 'Investimento').reduce((acc:number, curr:any) => acc + curr.amount, 0);

        // Opção B: Saldo Líquido no Centro
        centerValue = totalReceita - totalDespesa - totalInvestimento;
        centerLabel = "Saldo Líquido";

        // Gráfico com 3 fatias fixas
        chartData = [
            { name: 'Receitas', value: totalReceita, color: '#10B981' },      // Verde
            { name: 'Despesas', value: totalDespesa, color: '#EF4444' },      // Vermelho
            { name: 'Investimentos', value: totalInvestimento, color: '#6366F1' } // Roxo/Azul
        ].filter(d => d.value > 0); // Só mostra o que tem valor

    } else {
        // --- VISÃO ESPECÍFICA (Por Categoria) ---
        let items = filteredTrans.filter((t:any) => t.type === filterType);

        if (filterCat !== 'Todas') {
            items = items.filter((t:any) => t.category === filterCat);
        }

        const map = new Map();
        items.forEach((t: any) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
        
        centerValue = items.reduce((acc:number, curr:any) => acc + curr.amount, 0);
        centerLabel = filterType === 'Investimento' ? 'Total Aportado' : (filterType === 'Entrada' ? 'Total Recebido' : 'Total Gasto');

        chartData = Array.from(map, ([name, value]) => ({ 
            name, value, color: getRandomColor() 
        })).sort((a,b) => b.value - a.value);
    }

    return { chartData, centerValue, centerLabel };
  }, [transactions, filterType, filterCat]);

  // Lista Detalhada abaixo do gráfico
  const detailedList = useMemo(() => {
    let list = transactions;
    
    if (filterType !== 'Tudo') {
        list = list.filter((t:any) => t.type === filterType);
        if (filterCat !== 'Todas') {
            list = list.filter((t:any) => t.category === filterCat);
        }
    }
    // Se for 'Tudo', mostra tudo misturado (ordenado por data já vem do App)
    return list;
  }, [transactions, filterType, filterCat]);

  // Handler para mudar o tipo e resetar categoria
  const handleTypeChange = (type: any) => {
      setFilterType(type);
      setFilterCat('Todas');
  };

  return (
    <div className="p-4 pb-32">
      <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Relatórios</h2>
      
      {/* FILTROS */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
         <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}><Filter size={14} className="text-gray-400"/></div>
         
         <select value={filterType} onChange={e=>handleTypeChange(e.target.value)} className={`px-4 py-2 rounded-xl border text-sm font-bold outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-600'}`}>
            <option value="Tudo">Visão Geral (Tudo)</option>
            <option value="Saída">Despesas</option>
            <option value="Investimento">Investimentos</option>
            <option value="Entrada">Receitas</option>
         </select>

         {/* Dropdown de Categorias (Bloqueado se for TUDO) */}
         <div className="relative">
            <select 
                value={filterCat} 
                onChange={e=>setFilterCat(e.target.value)} 
                disabled={filterType === 'Tudo'}
                className={`px-4 py-2 rounded-xl border text-sm font-bold outline-none appearance-none pr-8 ${
                    filterType === 'Tudo' 
                    ? (darkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400') 
                    : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-600')
                }`}
            >
                <option value="Todas">Todas as Categorias</option>
                {filterType !== 'Tudo' && categories.map((c:string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute right-3 top-3 pointer-events-none ${filterType === 'Tudo' ? 'text-gray-500' : 'text-gray-400'}`} />
         </div>
      </div>

      {reportData.chartData.length > 0 ? (
        <>
          {/* GRÁFICO */}
          <div className={`p-6 rounded-[32px] shadow-sm border h-80 mb-6 relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={reportData.chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                  {reportData.chartData.map((entry:any, index:number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderColor: darkMode ? '#374151' : '#e5e7eb', borderRadius: '12px', padding: '10px' }}
                    itemStyle={{ color: darkMode ? '#F3F4F6' : '#111827', fontWeight: 'bold', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* TEXTO CENTRAL (OPÇÃO B) */}
            <div className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <p className="text-[10px] uppercase font-bold text-gray-400">{reportData.centerLabel}</p>
              <p className={`text-xl font-bold ${
                  // Se for TUDO e negativo = Vermelho, positivo = Verde. Se não, segue cor do tema
                  filterType === 'Tudo' 
                    ? (reportData.centerValue >= 0 ? 'text-emerald-500' : 'text-rose-500') 
                    : (darkMode ? 'text-white' : 'text-gray-800')
              }`}>
                {formatCurrency(reportData.centerValue)}
              </p>
            </div>
          </div>

          {/* LISTA DETALHADA COM CORES */}
          <div className="flex items-center gap-2 mb-3">
             <List size={18} className="text-gray-400"/>
             <h3 className={`font-bold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Extrato Detalhado</h3>
          </div>
          
          <div className="space-y-2">
            {detailedList.map((t: Transaction) => {
              const isIncome = t.type === 'Entrada';
              const isInvest = t.type === 'Investimento';
              
              // Cores dos Ícones
              const iconColor = isIncome 
                ? (darkMode ? 'text-emerald-400 bg-emerald-900/50' : 'text-emerald-600 bg-emerald-100') 
                : (isInvest 
                    ? (darkMode ? 'text-indigo-400 bg-indigo-900/50' : 'text-indigo-600 bg-indigo-100') 
                    : (darkMode ? 'text-rose-400 bg-rose-900/50' : 'text-rose-600 bg-rose-50')
                  );
              
              const icon = isIncome ? <ArrowUpCircle size={16}/> : (isInvest ? <TrendingUp size={16}/> : <ArrowDownCircle size={16}/>);

              // Cores dos Valores
              const amountColor = isIncome 
                ? 'text-emerald-500' 
                : (isInvest ? 'text-indigo-500' : 'text-rose-500');

              return (
                <div onClick={() => onSelectTransaction(t, 'reports')} key={t.id} className={`flex justify-between items-center p-4 rounded-xl border cursor-pointer active:opacity-70 ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-50 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${iconColor}`}>
                            {icon}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t.description}</p>
                            <p className="text-xs text-gray-400">{t.category} • {formatDate(t.date)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`font-bold text-sm ${amountColor}`}>{isIncome ? '+' : '-'}{formatCurrency(t.amount)}</span>
                        {t.installment && <p className="text-[10px] text-blue-500 font-bold">Parcela {t.installment.current}/{t.installment.total}</p>}
                    </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={`p-10 rounded-[32px] text-center border border-dashed mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
           <p className="text-gray-400 text-sm">Sem dados para este filtro.</p>
        </div>
      )}
    </div>
  );
};

// --- MODAL DE EDIÇÃO ---
const EditTransactionModal = ({ transaction, mode, onClose, onRewrite, onAnticipate, onDelete, settings, cards, darkMode }: any) => {
  const [desc, setDesc] = useState(transaction.description);
  const [cat, setCat] = useState(transaction.category);
  const [date, setDate] = useState(transaction.date);
  
  const [amount, setAmount] = useState(transaction.amount); 
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro'|'Cartão'>(transaction.paymentMethod);
  const [selectedCard, setSelectedCard] = useState(transaction.cardId || cards[0]?.id || '');
  const [installments, setInstallments] = useState(transaction.installment?.total || 1);

  const currentCategories = transaction.type === 'Entrada' 
    ? (settings.incomeCategories || DEFAULT_INCOME_CATS)
    : (transaction.type === 'Investimento' ? (settings.investmentCategories || DEFAULT_INVEST_CATS) : (settings.expenseCategories || DEFAULT_EXPENSE_CATS));

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
     if (transaction.installment) {
         setAmount(transaction.amount * transaction.installment.total);
     } else {
         setAmount(transaction.amount);
     }
  }, [transaction]);

  const handleSave = () => {
    const finalAmount = Number(amount);
    
    const isStructuralChange = 
        paymentMethod !== transaction.paymentMethod ||
        (paymentMethod === 'Cartão' && installments !== (transaction.installment?.total || 1)) ||
        (paymentMethod === 'Cartão' && selectedCard !== transaction.cardId);

    if (isStructuralChange) {
        if(confirm('Isso irá recriar todas as transações relacionadas. Continuar?')) {
            onRewrite(transaction, {
                description: desc, amount: finalAmount, category: cat, date: date,
                paymentMethod, cardId: paymentMethod === 'Cartão' ? selectedCard : null, installments
            });
            onClose();
        }
    } else {
        let saveAmount = finalAmount;
        if (transaction.installment) saveAmount = finalAmount / transaction.installment.total; 
        const cardIdToSave = paymentMethod === 'Cartão' ? selectedCard : null;
        onRewrite(transaction, { ...transaction, description: desc, amount: saveAmount, category: cat, date, cardId: cardIdToSave }, true);
        onClose();
    }
  };

  const handleAnticipateClick = () => {
      if(confirm('Deseja ANTECIPAR todas as parcelas futuras?')) { onAnticipate(transaction); onClose(); }
  };

  const handleDeleteAll = () => {
      if(confirm('Deseja realmente excluir este registro?')) { onDelete(transaction); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" style={{touchAction: 'none'}}>
       <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90dvh] ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`} style={{touchAction: 'pan-y'}}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-lg">Editar Detalhes</h3>
             <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
          </div>
          
          <div className="space-y-4">
             <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Total</label>
               <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className={`w-full p-3 rounded-xl border font-bold text-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`} />
             </div>
             
             {!transaction.transferId && (
                 <>
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
                 </>
             )}

             <div>
               <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
               <select value={cat} onChange={e=>setCat(e.target.value)} className={`w-full p-3 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  {currentCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
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
             <button onClick={handleSave} className={`w-full py-4 font-bold rounded-xl ${darkMode ? 'bg-emerald-600 text-white shadow-none' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-100/50'}`}>Salvar Alterações</button>
             
             {transaction.installment && transaction.installment.current < transaction.installment.total && (
                 <button onClick={handleAnticipateClick} className="w-full py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100">
                    <Zap size={18}/> Antecipar Parcelas Restantes
                 </button>
             )}

             <button onClick={handleDeleteAll} className="w-full py-3 bg-rose-50 text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-100">
                <Trash2 size={18}/> Excluir Registro
             </button>
          </div>
       </div>
    </div>
  );
};

// --- (CardsScreen) ---
const CardsScreen = ({ cards, transactions, currentMonthKey, onSaveCard, onDeleteCard, darkMode }: any) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHolder, setEditHolder] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editClosing, setEditClosing] = useState('');
  const [editDue, setEditDue] = useState('');

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
      setEditLimit(activeCard.limit.toString());
      setEditClosing(activeCard.closingDay.toString());
      setEditDue(activeCard.dueDay.toString());
      setIsEditing(true);
    }
  };

  const saveEdit = () => {
    if(activeCard) {
      onSaveCard({ 
          ...activeCard, 
          name: editName, 
          holder: editHolder,
          limit: parseFloat(editLimit),
          closingDay: parseInt(editClosing),
          dueDay: parseInt(editDue)
      });
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
                <input value={editName} onChange={e=>setEditName(e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Titular (Nome)</label>
                <input value={editHolder} onChange={e=>setEditHolder(e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
              </div>
              <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Limite</label>
                    <input type="number" value={editLimit} onChange={e=>setEditLimit(e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fech.</label>
                    <input type="number" value={editClosing} onChange={e=>setEditClosing(e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Venc.</label>
                    <input type="number" value={editDue} onChange={e=>setEditDue(e.target.value)} className={`w-full p-2 border rounded-lg text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}/>
                  </div>
              </div>
              <div className="flex gap-2 mt-2">
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

// --- PERFIL (ATUALIZADO) ---
const Profile = ({ user, categories, settings, onUpdateSettings, onAddCategory, onDeleteCategory, onLogout, monthlySavings, transactions, darkMode, onAddInitialBalance }: any) => {
  const [showCats, setShowCats] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showInvestments, setShowInvestments] = useState(false);
  
  const [newCat, setNewCat] = useState('');
  const [newInvestCat, setNewInvestCat] = useState('');

  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(settings.monthlyIncome.toString());

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  const handleSaveIncome = () => {
    onUpdateSettings({...settings, monthlyIncome: parseFloat(tempIncome)});
    setIsEditingIncome(false);
  };

  const handleAddGoal = () => {
    if(!newGoalName || !newGoalAmount) return;
    const newGoal: Goal = { id: generateId(), name: newGoalName, amount: parseFloat(newGoalAmount) };
    const updatedGoals = settings.goals ? [...settings.goals, newGoal] : [newGoal];
    onUpdateSettings({ ...settings, goals: updatedGoals });
    setNewGoalName(''); setNewGoalAmount('');
  };

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = settings.goals.filter((g:Goal) => g.id !== id);
    onUpdateSettings({ ...settings, goals: updatedGoals });
  };

  const handleAddInvestCat = () => {
      if(!newInvestCat) return;
      const currentList = settings.investmentCategories || DEFAULT_INVEST_CATS;
      onUpdateSettings({ ...settings, investmentCategories: [...currentList, newInvestCat] });
      setNewInvestCat('');
  };
  const handleDeleteInvestCat = (c: string) => {
      const currentList = settings.investmentCategories || DEFAULT_INVEST_CATS;
      onUpdateSettings({ ...settings, investmentCategories: currentList.filter((x:string) => x !== c) });
  };
  
  const handleAddManualBalance = () => {
      const amount = prompt("Digite o valor do saldo inicial (ex: 40000):");
      if(amount && !isNaN(parseFloat(amount))) {
          onAddInitialBalance(parseFloat(amount));
      }
  };

  const updateCategoryLimit = (cat: string, limit: string) => {
    const newLimits = { ...settings.categoryLimits, [cat]: parseFloat(limit) };
    onUpdateSettings({ ...settings, categoryLimits: newLimits });
  };

  const toggleDarkMode = () => {
    onUpdateSettings({ ...settings, darkMode: !settings.darkMode });
  };

  const totalGoals = settings.goals ? settings.goals.reduce((acc:number, g:Goal) => acc + g.amount, 0) : 0;

  const investmentsSummary = useMemo(() => {
      const investTransactions = transactions.filter((t:any) => t.type === 'Investimento');
      const map = new Map();
      investTransactions.forEach((t:any) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
      return Array.from(map, ([name, value]) => ({ name, value }));
  }, [transactions]);

  const investmentCats = settings.investmentCategories || DEFAULT_INVEST_CATS;

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
            {isEditingIncome ? (
              <div className="flex gap-2 items-center">
                <input autoFocus type="number" value={tempIncome} onChange={e=>setTempIncome(e.target.value)} className={`w-full p-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} />
                <button onClick={handleSaveIncome} className="bg-emerald-600 text-white p-2 rounded-lg"><Check size={18}/></button>
              </div>
            ) : (
              <div onClick={() => setIsEditingIncome(true)} className="flex items-center justify-between cursor-pointer">
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

         {/* Múltiplas Metas */}
         <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div onClick={() => setShowGoals(!showGoals)} className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-full ${darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><Target size={20}/></div>
                   <div>
                      <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Minhas Metas</p>
                      <p className="text-xs text-gray-400">Total: {formatCurrency(totalGoals)}</p>
                   </div>
                </div>
                <ChevronRight size={16} className={`text-gray-300 transition-transform ${showGoals ? 'rotate-90' : ''}`}/>
            </div>
            {showGoals && (
                <div className={`px-4 pb-4 border-t animate-in slide-in-from-top-2 ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex gap-2 mb-3 mt-3">
                        <input placeholder="Nome (Ex: Viagem)" value={newGoalName} onChange={e=>setNewGoalName(e.target.value)} className={`flex-1 p-2 text-xs border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`} />
                        <input type="number" placeholder="Valor" value={newGoalAmount} onChange={e=>setNewGoalAmount(e.target.value)} className={`w-20 p-2 text-xs border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`} />
                        <button onClick={handleAddGoal} className="bg-emerald-600 text-white p-2 rounded-lg"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2">
                    {settings.goals && settings.goals.map((g:Goal) => (
                        <div key={g.id} className={`flex justify-between items-center p-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>{g.name}</span>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(g.amount)}</span>
                                <button onClick={() => handleDeleteGoal(g.id)} className="text-gray-400 hover:text-rose-500"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
            )}
         </div>

         {/* Meus Investimentos (COM BOTÃO DE SALDO INICIAL) */}
         <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div onClick={() => setShowInvestments(!showInvestments)} className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-full ${darkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><TrendingUp size={20}/></div>
                   <div>
                      <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Meus Investimentos</p>
                      <p className="text-xs text-gray-400">Gerenciar Categorias</p>
                   </div>
                </div>
                <ChevronRight size={16} className={`text-gray-300 transition-transform ${showInvestments ? 'rotate-90' : ''}`}/>
            </div>
            {showInvestments && (
                <div className={`px-4 pb-4 border-t animate-in slide-in-from-top-2 ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                    
                    {/* Botão de Ajuste de Saldo */}
                    <button onClick={handleAddManualBalance} className="w-full mb-4 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 text-xs mt-2">
                        + Adicionar Saldo Inicial / Ajuste
                    </button>

                    <div className="flex gap-2 mb-3 mt-3">
                        <input placeholder="Nova Categoria (Ex: Cripto)" value={newInvestCat} onChange={e=>setNewInvestCat(e.target.value)} className={`flex-1 p-2 text-xs border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`} />
                        <button onClick={handleAddInvestCat} className="bg-emerald-600 text-white p-2 rounded-lg"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2">
                        {investmentCats.map((c: string) => {
                            const total = investmentsSummary.find(i => i.name === c)?.value || 0;
                            return (
                                <div key={c} className={`flex justify-between items-center p-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                                    <div>
                                        <span className={`text-sm font-medium block ${darkMode ? 'text-white' : 'text-gray-700'}`}>{c}</span>
                                        <span className="text-[10px] text-gray-400">Acumulado: {formatCurrency(total)}</span>
                                    </div>
                                    <button onClick={() => handleDeleteInvestCat(c)} className="text-gray-400 hover:text-rose-500"><Trash2 size={14}/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
         </div>

         {/* Categorias e Limites (Despesas) */}
         <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
             <div onClick={() => setShowCats(!showCats)} className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-full ${darkMode ? 'bg-rose-900/50 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><AlertCircle size={20}/></div>
                   <div>
                      <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>Limites de Despesas</p>
                      <p className="text-xs text-gray-400">{categories.length} categorias</p>
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

// --- TELA: NOVA TRANSAÇÃO ---
const AddTransaction = ({ onSave, onCancel, categories, cards, settings, monthDetails, darkMode }: any) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(categories[0] || 'Geral');
  const [type, setType] = useState<'Entrada' | 'Saída' | 'Investimento'>('Saída');
  const [method, setMethod] = useState<'Dinheiro' | 'Cartão'>('Dinheiro');
  const [selectedCard, setSelectedCard] = useState(cards[0]?.id || '');
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessages, setAlertMessages] = useState<string[]>([]);

  const currentCategories = useMemo(() => {
      if (type === 'Entrada') return settings.incomeCategories || DEFAULT_INCOME_CATS;
      if (type === 'Investimento') return settings.investmentCategories || DEFAULT_INVEST_CATS;
      return categories;
  }, [type, settings, categories]);

  useEffect(() => { setCat(currentCategories[0]); }, [currentCategories]);

  const parseAmount = (val: string) => {
    if (!val) return 0;
    const cleanVal = val.replace(',', '.').replace(/[^0-9.]/g, ''); 
    const result = parseFloat(cleanVal);
    return isNaN(result) ? 0 : result;
  };

  const checkBudgets = () => {
    const val = parseAmount(amount);
    if (val <= 0) { alert("Valor inválido."); return; }
    if (!desc.trim()) { alert("Insira uma descrição."); return; }

    const messages = [];

    if (type === 'Saída') {
        const catLimit = settings?.categoryLimits?.[cat] || 0;
        if (catLimit > 0 && val > catLimit) {
             messages.push(`Limite excedido em ${cat} (R$ ${formatCurrency(catLimit)}).`);
        }
        const totalGoals = settings.goals ? settings.goals.reduce((acc:number, g:Goal) => acc + g.amount, 0) : 0;
        const currentExpenses = monthDetails?.expenses || 0;
        const income = settings?.monthlyIncome || 0;
        const remainingAfterPurchase = income - (currentExpenses + val);
        if (totalGoals > 0 && remainingAfterPurchase < totalGoals) {
            const missing = totalGoals - remainingAfterPurchase;
            messages.push(`Atenção: Impacto em metas (${formatCurrency(missing)} faltantes).`);
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
        const cardIdToSave = (method === 'Cartão' && type === 'Saída') ? selectedCard : null;

        if (type === 'Saída' && method === 'Cartão' && installments > 1) {
           const parentId = generateId();
           const batch = [];
           const baseDate = new Date(date);
           for(let i = 0; i < installments; i++) {
              const currentInstDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate() + 1);
              batch.push({
                id: generateId(), description: `${desc} (${i+1}/${installments})`,
                amount: val / installments, type, category: cat, date: currentInstDate.toISOString().split('T')[0],
                month: currentInstDate.toISOString().slice(0, 7), paymentMethod: method, cardId: cardIdToSave,
                installment: { current: i+1, total: installments }, parentId
              });
           }
           await onSave(batch);
        } else {
           await onSave([{
             id: generateId(), description: desc, amount: val, type, category: cat,
             date: date, month: date.slice(0, 7), paymentMethod: method, cardId: cardIdToSave
           }]);
        }
    } catch (error) { alert("Erro ao salvar."); setIsSaving(false); }
  };

  return (
    <div className={`fixed inset-0 w-full h-full z-50 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`} style={{overscrollBehavior: 'none', height: '100dvh'}}>
      {showAlert && (
          <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
              <div className={`rounded-3xl p-6 w-full max-w-sm shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex justify-center mb-4"><div className="bg-amber-100 p-4 rounded-full text-amber-600"><AlertTriangle size={32}/></div></div>
                  <h3 className={`text-xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Atenção</h3>
                  <div className="space-y-2 mb-6">
                      {alertMessages.map((msg, idx) => (<p key={idx} className={`text-sm text-center p-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{msg}</p>))}
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => { setShowAlert(false); setIsSaving(false); }} className={`flex-1 py-3 font-bold rounded-xl ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>Revisar</button>
                      <button onClick={() => { setShowAlert(false); confirmSave(); }} className={`flex-1 py-3 font-bold rounded-xl ${darkMode ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white shadow-lg'}`}>Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      <div className={`p-4 flex justify-between items-center border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <button onClick={onCancel} className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100'}`}><X size={20}/></button>
        <h2 className="font-bold text-lg">Nova Transação</h2>
        <div className="w-9" />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); checkBudgets(); }} className="p-6 space-y-6 flex-1 overflow-y-auto pb-24 overscroll-contain" style={{ touchAction: 'pan-y' }}>
        <div>
           <label className="text-xs font-bold text-gray-400 uppercase">Valor Total</label>
           <input type="tel" value={amount} onChange={e => setAmount(e.target.value)}
             className={`w-full text-5xl font-bold bg-transparent placeholder-gray-500 focus:outline-none py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`} placeholder="0,00" autoFocus />
        </div>
        <div className={`flex p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button type="button" onClick={() => setType('Saída')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Saída' ? (darkMode ? 'bg-gray-700 text-rose-400' : 'bg-white text-rose-600 shadow-sm') : 'text-gray-400'}`}>Despesa</button>
          <button type="button" onClick={() => setType('Entrada')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Entrada' ? (darkMode ? 'bg-gray-700 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm') : 'text-gray-400'}`}>Receita</button>
          <button type="button" onClick={() => setType('Investimento')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${type === 'Investimento' ? (darkMode ? 'bg-gray-700 text-blue-400' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400'}`}>Investir</button>
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
            {currentCategories.map((c: string) => (
               <button key={c} type="button" onClick={() => setCat(c)} 
                 className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${cat === c ? 'bg-emerald-600 text-white border-emerald-600' : (darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white text-gray-600 border-gray-200')}`}>
                 {c}
               </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={isSaving} className={`w-full py-4 font-bold rounded-2xl transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed' : (darkMode ? 'bg-emerald-600 text-white shadow-none' : 'bg-emerald-600 text-white shadow-emerald-200')}`}>
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
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATS);
  const [settings, setSettings] = useState<UserSettings>({ monthlyIncome: 5000, financialGoal: 1000, goals: [], darkMode: false, categoryLimits: {} });
  
  const [screen, setScreen] = useState<AppScreen>(AppScreen.Home);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [editingTransaction, setEditingTransaction] = useState<{data: Transaction, mode: 'home'|'reports'} | null>(null);

  const monthsRef = useRef<HTMLDivElement>(null);

  const selectedMonthKey = getMonthKey(currentDate);
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();

  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    document.body.style.touchAction = 'pan-x pan-y';
    document.body.style.overscrollBehaviorY = 'none';
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
    filteredTransactions.forEach(t => {
        if(t.type === 'Entrada') inc += t.amount;
        else if (t.type === 'Investimento' && t.category === 'Saldo Inicial') {
            // LÓGICA ESPECIAL: Se for "Saldo Inicial", não conta como despesa do mês para não negativar o saldo
        }
        else exp += t.amount;
    });
    return { income: inc, expenses: exp, balance: inc - exp };
  }, [filteredTransactions]);

  useEffect(() => {
    if (monthsRef.current) {
        const scrollPos = (currentMonthIdx * 70) - (window.innerWidth / 2) + 35;
        monthsRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [currentMonthIdx, screen]);

  const handleLogin = async (e:any) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); } catch(e) { alert("Erro ao entrar."); } };
  
  const addTransactions = async (newTrans: Transaction[]) => {
    if(!user) return;
    const batch = writeBatch(db);
    newTrans.forEach(t => batch.set(doc(db, `users/${user.uid}/transactions`, t.id), t));
    await batch.commit();
    setScreen(AppScreen.Home);
  };

  const transferBalance = async (balance: number) => {
      if(!user) return;
      if(balance <= 0) return alert("Não há saldo positivo para transferir.");
      
      const batch = writeBatch(db);
      const transferId = generateId();
      
      const lastDayCurrent = new Date(currentYear, currentMonthIdx + 1, 0); 
      const t1Id = generateId();
      batch.set(doc(db, `users/${user.uid}/transactions`, t1Id), {
          id: t1Id, description: 'Transferência para Mês Seguinte', amount: balance, type: 'Saída', category: 'Transferência',
          date: lastDayCurrent.toISOString().split('T')[0], month: selectedMonthKey, paymentMethod: 'Dinheiro', transferId
      });

      const firstDayNext = new Date(currentYear, currentMonthIdx + 1, 1);
      const t2Id = generateId();
      batch.set(doc(db, `users/${user.uid}/transactions`, t2Id), {
          id: t2Id, description: 'Sobra do Mês Anterior', amount: balance, type: 'Entrada', category: 'Saldo Anterior',
          date: firstDayNext.toISOString().split('T')[0], month: getMonthKey(firstDayNext), paymentMethod: 'Dinheiro', transferId
      });

      await batch.commit();
      alert("Saldo transferido com sucesso!");
  };

  const rewriteTransaction = async (oldT: Transaction, newData: any, isSimpleUpdate = false) => {
     if(!user) return;
     const batch = writeBatch(db);
     if (isSimpleUpdate) { batch.update(doc(db, `users/${user.uid}/transactions`, oldT.id), newData); await batch.commit(); return; }
     
     if (oldT.transferId) {
         const pair = rawTransactions.filter(t => t.transferId === oldT.transferId);
         pair.forEach(p => batch.delete(doc(db, `users/${user.uid}/transactions`, p.id)));
     } else if (oldT.parentId) {
        const siblings = rawTransactions.filter(rt => rt.parentId === oldT.parentId);
        siblings.forEach(s => batch.delete(doc(db, `users/${user.uid}/transactions`, s.id)));
     } else {
        batch.delete(doc(db, `users/${user.uid}/transactions`, oldT.id));
     }

     if (newData.paymentMethod === 'Cartão' && newData.installments > 1) {
        const parentId = generateId();
        const baseDate = new Date(newData.date);
        for(let i = 0; i < newData.installments; i++) {
            const currentInstDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate() + 1);
            const newId = generateId();
            batch.set(doc(db, `users/${user.uid}/transactions`, newId), {
                id: newId, description: `${newData.description} (${i+1}/${newData.installments})`,
                amount: newData.amount / newData.installments, type: oldT.type, category: newData.category,
                date: currentInstDate.toISOString().split('T')[0], month: currentInstDate.toISOString().slice(0, 7),
                paymentMethod: 'Cartão', cardId: newData.cardId, installment: { current: i+1, total: newData.installments }, parentId
            });
        }
     } else {
        const newId = generateId();
        batch.set(doc(db, `users/${user.uid}/transactions`, newId), {
            id: newId, description: newData.description, amount: newData.amount, type: oldT.type, category: newData.category,
            date: newData.date, month: newData.date.slice(0, 7), paymentMethod: 'Dinheiro', cardId: null
        });
     }
     await batch.commit();
  };

  const anticipateTransaction = async (t: Transaction) => {
      if(!user || !t.parentId || !t.installment) return;
      const batch = writeBatch(db);
      const currentNum = t.installment.current;
      const futureInstallments = rawTransactions.filter(rt => rt.parentId === t.parentId && rt.installment && rt.installment.current >= currentNum);
      const totalRemaining = futureInstallments.reduce((acc, curr) => acc + curr.amount, 0);
      futureInstallments.forEach(inst => { batch.delete(doc(db, `users/${user.uid}/transactions`, inst.id)); });
      const newId = generateId();
      const today = new Date().toISOString().split('T')[0];
      batch.set(doc(db, `users/${user.uid}/transactions`, newId), {
          id: newId, description: `${t.description.split('(')[0]} (Antecipação)`, amount: totalRemaining,
          type: 'Saída', category: t.category, date: today, month: today.slice(0, 7), paymentMethod: 'Dinheiro', cardId: t.cardId
      });
      await batch.commit();
  };

  const deleteTransaction = async (t: Transaction) => {
    if(!user) return;
    const batch = writeBatch(db);
    if (t.transferId) { 
       const pair = rawTransactions.filter(tr => tr.transferId === t.transferId);
       pair.forEach(p => batch.delete(doc(db, `users/${user.uid}/transactions`, p.id)));
    } else if (t.installment && t.parentId) {
       const allInstallments = rawTransactions.filter(rt => rt.parentId === t.parentId);
       allInstallments.forEach(inst => { batch.delete(doc(db, `users/${user.uid}/transactions`, inst.id)); });
    } else {
       batch.delete(doc(db, `users/${user.uid}/transactions`, t.id));
    }
    await batch.commit();
  };

  // ADICIONAR SALDO INICIAL (INVESTIMENTO) SEM AFETAR FLUXO
  const addInitialBalance = async (amount: number) => {
      if(!user) return;
      const id = generateId();
      // Cria a transação com data de hoje e categoria específica
      const today = new Date().toISOString().split('T')[0];
      const newTrans: Transaction = {
          id,
          description: 'Saldo Inicial / Ajuste Manual',
          amount,
          type: 'Investimento',
          category: 'Saldo Inicial', // Importante para a lógica de exclusão do fluxo
          date: today,
          month: today.slice(0, 7),
          paymentMethod: 'Dinheiro'
      };
      await setDoc(doc(db, `users/${user.uid}/transactions`, id), newTrans);
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
  const deleteCard = async (cardId: string) => {
    if(!user) return;
    const newList = cards.filter(c => c.id !== cardId);
    setCards(newList);
    await setDoc(doc(db, `users/${user.uid}/settings`, 'cards'), { list: newList }, { merge: true });
  };

  const changeMonth = (idx: number) => setCurrentDate(new Date(currentYear, idx, 1));
  const changeYear = (dir: number) => {
    const newYear = currentYear + dir;
    const newMonth = dir > 0 ? 0 : 11;
    setCurrentDate(new Date(newYear, newMonth, 1));
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500"/></div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
          <div className="flex justify-center mb-8"><div className="bg-emerald-50 p-4 rounded-full"><LogIn size={32} className="text-emerald-600" /></div></div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Finanças Casal</h1>
          <p className="text-center text-gray-500 text-xs mb-8 uppercase tracking-wide">Acesse sua conta</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email</label><input type="email" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 focus:border-emerald-500" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Senha</label><input type="password" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 focus:border-emerald-500" value={password} onChange={e=>setPassword(e.target.value)} /></div>
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
           <div ref={monthsRef} className="flex overflow-x-auto px-6 gap-3 pb-4 scrollbar-hide">
              {MONTHS.map((m, idx) => (
                 <button key={m} onClick={() => changeMonth(idx)} 
                   className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${idx === currentMonthIdx ? (isDark ? 'bg-emerald-600 text-white shadow-none' : 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50') : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-400 hover:bg-gray-100')}`}>
                   {m}
                 </button>
              ))}
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-4 scrollbar-hide">
        {screen === AppScreen.Home && <Home transactions={filteredTransactions} monthDetails={monthDetails} onSelectTransaction={(t:any) => setEditingTransaction({data: t, mode: 'home'})} onTransferBalance={transferBalance} darkMode={isDark} />}
        {screen === AppScreen.Reports && <Reports transactions={filteredTransactions} categories={categories} darkMode={isDark} onSelectTransaction={(t:any) => setEditingTransaction({data: t, mode: 'reports'})} />}
        {screen === AppScreen.Cards && <CardsScreen cards={cards} transactions={rawTransactions} currentMonthKey={selectedMonthKey} onSaveCard={saveCard} onDeleteCard={deleteCard} darkMode={isDark} />}
        {screen === AppScreen.Profile && <Profile user={user} categories={categories} settings={settings} transactions={rawTransactions} onUpdateSettings={updateSettings} onAddCategory={(c:string)=>updateCategories([...categories,c])} onDeleteCategory={(c:string)=>updateCategories(categories.filter(x=>x!==c))} onLogout={()=>signOut(auth)} monthlySavings={monthDetails.balance} darkMode={isDark} onAddInitialBalance={addInitialBalance} />}
      </div>

      {screen !== AppScreen.Add && (
        <div className={`fixed bottom-0 w-full border-t p-2 pb-6 flex justify-between items-center px-8 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <button onClick={() => setScreen(AppScreen.Home)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Home ? 'text-emerald-500' : 'text-gray-400'}`}><LayoutDashboard size={24} strokeWidth={screen===AppScreen.Home?2.5:2} /><span className="text-[10px] font-bold">Início</span></button>
          <button onClick={() => setScreen(AppScreen.Cards)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Cards ? 'text-emerald-500' : 'text-gray-400'}`}><CreditCard size={24} strokeWidth={screen===AppScreen.Cards?2.5:2} /><span className="text-[10px] font-bold">Cartões</span></button>
          <div className="relative -top-8"><button onClick={() => setScreen(AppScreen.Add)} className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform ${isDark ? 'bg-emerald-600 text-white shadow-none' : 'bg-emerald-600 text-white shadow-emerald-100/50'}`}><Plus size={32}/></button></div>
          <button onClick={() => setScreen(AppScreen.Reports)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Reports ? 'text-emerald-500' : 'text-gray-400'}`}><PieChartIcon size={24} strokeWidth={screen===AppScreen.Reports?2.5:2} /><span className="text-[10px] font-bold">Relatórios</span></button>
          <button onClick={() => setScreen(AppScreen.Profile)} className={`flex flex-col items-center gap-1 ${screen === AppScreen.Profile ? 'text-emerald-500' : 'text-gray-400'}`}><UserIcon size={24} strokeWidth={screen===AppScreen.Profile?2.5:2} /><span className="text-[10px] font-bold">Perfil</span></button>
        </div>
      )}

      {screen === AppScreen.Add && <AddTransaction categories={categories} cards={cards} settings={settings} monthDetails={monthDetails} onSave={addTransactions} onCancel={() => setScreen(AppScreen.Home)} darkMode={isDark} />}
      
      {editingTransaction && (
        <EditTransactionModal 
          transaction={editingTransaction.data} 
          mode={editingTransaction.mode}
          categories={categories}
          settings={settings}
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