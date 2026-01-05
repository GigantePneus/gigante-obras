
import React, { useState, useEffect, useMemo } from 'react';
import { Expense, Category, Project, Theme } from './types';
import { INITIAL_CATEGORIES, INITIAL_PROJECTS, BRAND_LOGO_WHITE, BRAND_LOGO_DARK } from './constants';
import StatCard from './components/StatCard';
import ExpenseForm from './components/ExpenseForm';
import { getFinancialInsights } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('gigante_theme');
    return (saved as Theme) || 'light';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Estados para edição nas configurações
  const [newCatName, setNewCatName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Carregar dados iniciais do Supabase
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('gigante_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const fetchData = async () => {
    // Buscar categorias
    const { data: catData } = await supabase.from('categories').select('*');
    if (catData) setCategories(catData);

    // Buscar projetos
    const { data: projData } = await supabase.from('projects').select('*');
    if (projData) setProjects(projData);

    // Buscar despesas
    const { data: expData } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (expData) {
      const formattedExpenses = expData.map(e => ({
        ...e,
        categoryId: e.category_id,
        projectId: e.project_id
      }));
      setExpenses(formattedExpenses);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const getCategory = (id: string) => categories.find(c => c.id === id) || { name: 'Outros', color: '#ccc' };
  const getProject = (id: string) => projects.find(p => p.id === id) || { name: 'Geral' };

  const addExpense = async (data: Omit<Expense, 'id'>) => {
    const { error } = await supabase.from('expenses').insert({
      description: data.description,
      amount: data.amount,
      date: data.date,
      category_id: data.categoryId,
      project_id: data.projectId,
      receipt_url: data.receipt || null
    });

    if (error) {
      alert('Erro ao salvar despesa: ' + error.message);
    } else {
      fetchData(); // Recarrega tudo para garantir sincronia
    }
  };

  const removeExpense = async (id: string) => {
    if (window.confirm('Excluir este comprovante da obra?')) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (!error) {
        setExpenses(expenses.filter(e => e.id !== id));
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const projMatch = filterProject === 'all' || e.projectId === filterProject;
      const catMatch = filterCategory === 'all' || e.categoryId === filterCategory;
      return projMatch && catMatch;
    });
  }, [expenses, filterProject, filterCategory]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? total / count : 0;

    const catTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      catTotals[e.categoryId] = (catTotals[e.categoryId] || 0) + e.amount;
    });
    const topCatId = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topCat = topCatId ? getCategory(topCatId).name : 'Nenhuma';

    return { total, avg, topCat, count };
  }, [filteredExpenses, categories]);

  const chartData = useMemo(() => {
    const dataMap: Record<string, { name: string, value: number, fill: string }> = {};
    expenses.forEach(e => {
      const cat = getCategory(e.categoryId);
      if (!dataMap[e.categoryId]) {
        dataMap[e.categoryId] = { name: cat.name, value: 0, fill: cat.color };
      }
      dataMap[e.categoryId].value += e.amount;
    });
    return Object.values(dataMap);
  }, [expenses, categories]);

  const timelineData = useMemo(() => {
    const map: Record<string, number> = {};
    const sorted = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach(e => {
      const date = e.date.split('-').slice(1).reverse().join('/');
      map[date] = (map[date] || 0) + e.amount;
    });
    return Object.entries(map).map(([date, val]) => ({ date, val }));
  }, [expenses]);

  const handleGetInsight = async () => {
    setLoadingInsight(true);
    try {
      const insight = await getFinancialInsights(expenses);
      setAiInsight(insight);
    } catch (err) {
      setAiInsight("Erro na análise.");
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const colors = ['#009739', '#002776', '#FFDF00', '#ef4444', '#f59e0b', '#64748b', '#8b5cf6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data, error } = await supabase.from('categories').insert({
      name: newCatName.trim(),
      color: randomColor
    }).select();

    if (error) {
      alert('Erro ao criar categoria: ' + error.message);
    } else if (data) {
      setCategories([...categories, data[0]]);
      setNewCatName('');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const { data, error } = await supabase.from('projects').insert({
      name: newProjectName.trim(),
      status: 'em_andamento'
    }).select();

    if (error) {
      alert('Erro ao criar unidade: ' + error.message);
    } else if (data) {
      setProjects([...projects, data[0]]);
      setNewProjectName('');
    }
  };

  const removeCategory = async (id: string) => {
    if (window.confirm('Excluir esta categoria? Lançamentos existentes ficarão sem categoria.')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) {
        setCategories(categories.filter(c => c.id !== id));
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const removeProject = async (id: string) => {
    if (window.confirm('Excluir esta unidade?')) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (!error) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden min-h-screen">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="absolute top-0 bottom-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="mb-8 flex items-center justify-between">
              <div className="bg-brand-green w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl">G</div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-red-500">✕</button>
            </div>

            <nav className="space-y-3 flex-grow">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-brand-green text-white shadow-xl shadow-green-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span>Resumo Geral</span>
              </button>
              <button
                onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'history' ? 'bg-brand-green text-white shadow-xl shadow-green-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span>Histórico Obras</span>
              </button>
              <button
                onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'settings' ? 'bg-brand-green text-white shadow-xl shadow-green-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span>Configurações</span>
              </button>
            </nav>

            <div className="mt-8">
              <button
                onClick={() => { handleGetInsight(); setIsMobileMenuOpen(false); }}
                className="w-full bg-brand-blue text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                IA Gigante
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8">
        <div className="mb-12 flex flex-col items-center">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl mb-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center">
            <img
              src={theme === 'light' ? BRAND_LOGO_DARK : BRAND_LOGO_WHITE}
              alt="Gigante Pneus"
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-sm font-black tracking-[0.2em] text-brand-green">IMPLANTAÇÃO</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Equipe de Obras</p>
        </div>

        <nav className="space-y-3 flex-grow">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-brand-green text-white shadow-xl shadow-green-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <span>Resumo Geral</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'history' ? 'bg-brand-green text-white shadow-xl shadow-green-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <span>Histórico Obras</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'settings' ? 'bg-brand-green text-white shadow-xl shadow-green-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <span>Configurações</span>
          </button>
        </nav>

        <div className="mt-auto space-y-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center space-x-3 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black tracking-widest transition-all"
          >
            {theme === 'light' ? '🌙 MODO ESCURO' : '☀️ MODO CLARO'}
          </button>

          <div className="p-5 bg-slate-900 dark:bg-brand-blue rounded-3xl text-white">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest text-center">IA GIGANTE</h4>
            <button
              onClick={handleGetInsight}
              disabled={loadingInsight || expenses.length === 0}
              className="text-xs bg-brand-green hover:brightness-110 w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {loadingInsight ? 'ANALISANDO...' : 'DASHBOARD INTELIGENTE'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col relative overflow-y-auto custom-scrollbar">
        {/* Mobile Header */}
        <div className="lg:hidden p-6 flex justify-between items-center bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-800 dark:text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="font-black text-lg tracking-tight">GIGANTE OBRAS</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === 'settings') setActiveTab('dashboard');
                setIsFormOpen(true);
              }}
              className="bg-brand-green text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest"
            >
              + Nota
            </button>
          </div>
        </div>


        <div className="p-6 lg:p-12">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-4xl font-black text-slate-800 dark:text-white leading-tight">Consolidação de Custos</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Controle de Implantação e Montagem de Unidades</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Investido" value={`R$ ${stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<div className="font-black text-xl">R$</div>} />
                <StatCard title="Custo Médio p/ Gasto" value={`R$ ${stats.avg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<div className="font-black text-xl">📊</div>} />
                <StatCard title="Gargalo de Custo" value={String(stats.topCat)} icon={<div className="font-black text-xl">⚠️</div>} />
                <StatCard title="Lançamentos" value={String(stats.count)} icon={<div className="font-black text-xl">📄</div>} />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl">
                  <h3 className="font-black mb-8 uppercase text-[10px] tracking-widest text-slate-400">Distribuição por Categoria</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl">
                  <h3 className="font-black mb-8 uppercase text-[10px] tracking-widest text-slate-400">Fluxo de Gastos no Tempo</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="val" stroke="#009739" strokeWidth={5} dot={{ r: 6, fill: '#009739', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {aiInsight && (
                <div className="bg-gradient-to-br from-brand-blue to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-brand-green/20 transition-all"></div>
                  <h3 className="font-black text-xl mb-6 flex items-center gap-3">
                    <span className="bg-brand-green p-2 rounded-xl">⚡</span>
                    Análise da Equipe Gigante
                  </h3>
                  <p className="opacity-90 leading-relaxed font-bold whitespace-pre-wrap text-lg">{String(aiInsight)}</p>
                  <button onClick={() => setAiInsight(null)} className="mt-8 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Entendido</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8 animate-in slide-in-from-right-5 duration-500 max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-4xl font-black">Lançamentos</h2>
                <div className="flex flex-wrap justify-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto">
                  <select
                    className="bg-transparent border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white"
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value)}
                  >
                    <option value="all">Todas as Unidades</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center"></div>
                  <select
                    className="bg-transparent border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                  >
                    <option value="all">Todas as Categorias</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredExpenses.map(e => (
                  <div key={e.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-brand-green group">
                    <div className="flex items-center gap-6 flex-grow w-full md:w-auto">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-lg flex-shrink-0" style={{ backgroundColor: getCategory(e.categoryId).color }}>
                        {getCategory(e.categoryId).name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 dark:text-white group-hover:text-brand-green transition-colors">{String(e.description)}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getProject(e.projectId).name}</span>
                          <span className="text-[10px] text-slate-300 hidden sm:inline">•</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getCategory(e.categoryId).name}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(e.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Gasto</p>
                        <p className="font-black text-xl text-brand-green">R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.receipt && (
                          <button onClick={() => setSelectedReceipt(e.receipt!)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-brand-blue hover:text-white transition-all shadow-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          </button>
                        )}
                        <button onClick={() => removeExpense(e.id)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredExpenses.length === 0 && (
                  <div className="py-24 text-center">
                    <div className="text-6xl mb-4 opacity-20">🏗️</div>
                    <p className="text-slate-400 font-black uppercase tracking-widest">Nenhum registro para os filtros selecionados.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
              <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black">Configurações</h2>
                <p className="text-slate-500 font-medium">Gerencie as Unidades de Implementação e Categorias de Obra.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Categorias Section */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Categorias de Gasto</h3>

                  <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      placeholder="Nova categoria (ex: EPI)"
                      className="flex-grow bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-green transition-all"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                    />
                    <button type="submit" className="bg-brand-green text-white p-3 rounded-xl hover:brightness-110 transition-all font-black">+</button>
                  </form>

                  <div className="space-y-2">
                    {categories.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{String(c.name)}</span>
                        </div>
                        <button onClick={() => removeCategory(c.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projetos/Unidades Section */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Unidades / Obras</h3>

                  <form onSubmit={handleAddProject} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      placeholder="Nova unidade (ex: Loja Natal)"
                      className="flex-grow bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-green transition-all"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                    />
                    <button type="submit" className="bg-brand-green text-white p-3 rounded-xl hover:brightness-110 transition-all font-black">+</button>
                  </form>

                  <div className="space-y-2">
                    {projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{String(p.name)}</span>
                        <button onClick={() => removeProject(p.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-brand-blue/5 dark:bg-brand-blue/20 p-8 rounded-[3rem] border border-brand-blue/10">
                <h4 className="font-black text-brand-blue dark:text-brand-yellow uppercase text-xs tracking-widest mb-2">💡 Dica de Implementação</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  As configurações aqui feitas impactam diretamente o formulário de lançamento. Recomendamos sincronizar com o escritório central.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FAB - Somente se não estiver em Configurações para não poluir */}
        {activeTab !== 'settings' && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="fixed bottom-8 right-8 bg-brand-green text-white w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center lg:w-auto lg:px-10 lg:h-16 lg:font-black lg:gap-3 hover:scale-105 active:scale-95 transition-all z-40 group"
          >
            <span className="text-2xl group-hover:rotate-90 transition-transform font-black">+</span>
            <span className="hidden lg:inline text-[10px] tracking-[0.2em] uppercase">Registrar Novo Gasto</span>
          </button>
        )}
      </main>

      {/* Receipt Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}>
          <div className="max-w-3xl w-full flex flex-col gap-4 animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end">
              <button onClick={() => setSelectedReceipt(null)} className="bg-white/10 p-4 rounded-full text-white hover:bg-red-500 transition-colors shadow-lg">✕</button>
            </div>
            <img src={selectedReceipt} className="w-full h-auto max-h-[85vh] object-contain rounded-3xl shadow-2xl border-4 border-white/10" alt="Nota Fiscal" />
          </div>
        </div>
      )}

      {isFormOpen && (
        <ExpenseForm
          categories={categories}
          projects={projects}
          onAdd={addExpense}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
