import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell 
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
const DEFAULT_INVEST_CATS = ['Reserva', 'Casa', 'Carro', 'Aposentadoria'];

const INITIAL_CARDS: CardData[] = [
  { id: 'card_nubank', name: 'Nubank', holder: 'Bruno', limit: 5000, closingDay: 1, dueDay: 8, color: 'border-l-purple-600' },
  { id: 'card_inter', name: 'Inter', holder: 'Carla', limit: 3000, closingDay: 10, dueDay: 17, color: 'border-l-orange-500' },
];

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// PALETA DE CORES
const CHART_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Rose
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F43F5E', // Rose Red
  '#14B8A6'  // Teal
];

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
             // CORREÇÃO: Mostra apenas o valor da parcela/transação, não o total
             const displayAmount = t.amount; 
             
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
                  {t.installment && <p className="text-[10px] text-gray-400">Valor da parcela</p>}
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

// --- TELA: RELATÓRIOS (CORRIGIDA - PORCENTAGEM SOBRE RENDA) ---
const Reports = ({ transactions, categories, settings, darkMode, onSelectTransaction }: any) => {
  const [filterType, setFilterType] = useState<'Tudo' | 'Saída' | 'Entrada' | 'Investimento'>('Tudo');
  const [filterCat, setFilterCat] = useState('Todas');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calcula o TOTAL DE ENTRADAS (RENDA) do mês para usar como base 100%
  const totalIncome = useMemo(() => {
      const income = transactions
        .filter((t: any) => t.type === 'Entrada' && t.category !== 'Saldo Inicial')
        .reduce((acc: number, curr: any) => acc + curr.amount, 0);
      return income > 0 ? income : 1; // Evita divisão por zero
  }, [transactions]);

  // Filtra categorias corretas baseadas no tipo selecionado
  const availableCategories = useMemo(() => {
     if (filterType === 'Entrada') return settings.incomeCategories || DEFAULT_INCOME_CATS;
     if (filterType === 'Investimento') return settings.investmentCategories || DEFAULT_INVEST_CATS;
     if (filterType === 'Saída') return settings.expenseCategories || categories;
     return [];
  }, [filterType, settings, categories]);

  const reportData = useMemo(() => {
    // 1. FILTRAGEM CRÍTICA: Remove "Saldo Inicial" dos relatórios de fluxo
    const filteredTrans = transactions.filter((t:any) => t.category !== 'Saldo Inicial');

    let chartData: any[] = [];
    let centerValue = 0;
    let centerLabel = "";
    let centerColor = "";
    let centerSubtext = null;

    if (filterType === 'Tudo') {
        // --- VISÃO GERAL (MACRO) ---
        const totalReceita = filteredTrans.filter((t:any) => t.type === 'Entrada').reduce((acc:number, curr:any) => acc + curr.amount, 0);
        const totalDespesa = filteredTrans.filter((t:any) => t.type === 'Saída').reduce((acc:number, curr:any) => acc + curr.amount, 0);
        const totalInvestimento = filteredTrans.filter((t:any) => t.type === 'Investimento').reduce((acc:number, curr:any) => acc + curr.amount, 0);

        centerValue = totalReceita - totalDespesa - totalInvestimento;
        centerLabel = "Saldo Líquido";
        centerColor = centerValue >= 0 ? '#10B981' : '#EF4444';

        chartData = [
            { name: 'Receitas', value: totalReceita, color: '#10B981' }, 
            { name: 'Despesas', value: totalDespesa, color: '#EF4444' }, 
            { name: 'Investimentos', value: totalInvestimento, color: '#6366F1' } 
        ].filter(d => d.value > 0);

    } else {
        // --- VISÃO ESPECÍFICA ---
        let items = filteredTrans.filter((t:any) => t.type === filterType);

        if (filterCat !== 'Todas') {
            items = items.filter((t:any) => t.category === filterCat);
        }

        const map = new Map();
        items.forEach((t: any) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
        
        centerValue = items.reduce((acc:number, curr:any) => acc + curr.amount, 0);
        centerLabel = filterType === 'Investimento' ? 'Total Aportado' : (filterType === 'Entrada' ? 'Total Recebido' : 'Total Gasto');
        centerColor = darkMode ? '#FFFFFF' : '#1F2937';

        chartData = Array.from(map, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        chartData = chartData.map((item, index) => ({
            ...item,
            color: CHART_COLORS[index % CHART_COLORS.length]
        }));
    }

    // Lógica para mostrar detalhes da fatia clicada no centro
    if (activeIndex !== null && chartData[activeIndex]) {
        const selected = chartData[activeIndex];
        let percentBase = 0;
        let suffix = "";

        // LÓGICA DE PORCENTAGEM CORRIGIDA:
        // Se for "Tudo", base é a RENDA (totalIncome).
        // Se for categoria específica (ex: Mercado), base é o total de Despesas.
        if (filterType === 'Tudo') {
            if (selected.name === 'Receitas') {
                percentBase = selected.value; // Receita sobre Receita é 100%
                suffix = " das Entradas";
            } else {
                percentBase = totalIncome;
                suffix = " da Renda";
            }
        } else {
            // No detalhe (ex: só Despesas), a porcentagem é sobre o total daquele grupo
            percentBase = chartData.reduce((acc, curr) => acc + curr.value, 0);
            suffix = " do Total";
        }

        const percent = percentBase > 0 ? ((selected.value / percentBase) * 100).toFixed(1) : '0';
        
        return { 
            chartData, 
            centerValue: selected.value, 
            centerLabel: selected.name, 
            centerSubtext: `${percent}%${suffix}`, 
            centerColor: selected.color 
        };
    }

    return { chartData, centerValue, centerLabel, centerSubtext, centerColor };
  }, [transactions, filterType, filterCat, activeIndex, darkMode, totalIncome]);

  const detailedList = useMemo(() => {
    // Filtra para não mostrar Saldo Inicial na lista
    let list = transactions.filter((t:any) => t.category !== 'Saldo Inicial');
    
    if (filterType !== 'Tudo') {
        list = list.filter((t:any) => t.type === filterType);
        if (filterCat !== 'Todas') {
            list = list.filter((t:any) => t.category === filterCat);
        }
    }
    return list;
  }, [transactions, filterType, filterCat]);

  const handleTypeChange = (type: any) => {
      setFilterType(type);
      setFilterCat('Todas');
      setActiveIndex(null);
  };

  const onPieClick = (_: any, index: number) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <div className="p-4 pb-32">
      <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Relatórios</h2>
      
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
         <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}><Filter size={14} className="text-gray-400"/></div>
         
         <select value={filterType} onChange={e=>handleTypeChange(e.target.value)} className={`px-4 py-2 rounded-xl border text-sm font-bold outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-600'}`}>
            <option value="Tudo">Visão Geral (Tudo)</option>
            <option value="Saída">Despesas</option>
            <option value="Investimento">Investimentos</option>
            <option value="Entrada">Receitas</option>
         </select>

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
                {availableCategories.map((c:string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute right-3 top-3 pointer-events-none ${filterType === 'Tudo' ? 'text-gray-500' : 'text-gray-400'}`} />
         </div>
      </div>

      <div className={`p-6 rounded-[32px] shadow-sm border h-80 mb-6 relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
                data={reportData.chartData} 
                cx="50%" cy="50%" 
                innerRadius={70} 
                outerRadius={90} 
                paddingAngle={5} 
                dataKey="value"
                onClick={onPieClick}
                style={{ outline: 'none' }}
            >
              {reportData.chartData.map((entry:any, index:number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    strokeWidth={0} 
                    style={{ outline: 'none' }}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.3} 
                  />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: '80%' }}>
          <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{reportData.centerLabel}</p>
          <p className="text-xl font-bold truncate" style={{ color: reportData.centerColor }}>
            {formatCurrency(reportData.centerValue)}
          </p>
          {reportData.centerSubtext && (
              <p className={`text-sm font-bold mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {reportData.centerSubtext}
              </p>
          )}
        </div>
        {activeIndex === null && (
            <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-gray-400 opacity-50">
                Toque no gráfico para detalhes
            </p>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
         <List size={18} className="text-gray-400"/>
         <h3 className={`font-bold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Extrato Detalhado</h3>
      </div>
      
      <div className="space-y-2">
        {detailedList.map((t: Transaction) => {
          const isIncome = t.type === 'Entrada';
          const isInvest = t.type === 'Investimento';
          
          const iconColor = isIncome 
            ? (darkMode ? 'text-emerald-400 bg-emerald-900/50' : 'text-emerald-600 bg-emerald-100') 
            : (isInvest 
                ? (darkMode ? 'text-indigo-400 bg-indigo-900/50' : 'text-indigo-600 bg-indigo-100') 
                : (darkMode ? 'text-rose-400 bg-rose-900/50' : 'text-rose-600 bg-rose-50')
              );
          const icon = isIncome ? <ArrowUpCircle size={16}/> : (isInvest ? <TrendingUp size={16}/> : <ArrowDownCircle size={16}/>);
          const amountColor = isIncome ? 'text-emerald-500' : (isInvest ? 'text-indigo-500' : 'text-rose-500');

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
         setAmount(transaction.amount); // Já mostra o valor da parcela, não o total
     } else {
         setAmount(transaction.amount);
     }
  }, [transaction]);

  const handleSave = () => {
    const finalAmount = Number(amount);
    
    // Lógica simplificada de edição
    onRewrite(transaction, { 
        description: desc, 
        amount: finalAmount, 
        category: cat, 
        date: date, 
        paymentMethod, 
        cardId: paymentMethod === 'Cartão' ? selectedCard : null 
    }, true);
    onClose();
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
               <label className="text-[10px] font-bold text-gray-400 uppercase">Valor</label>
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