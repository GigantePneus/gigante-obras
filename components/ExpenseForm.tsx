
import React, { useState, useRef } from 'react';
import { Expense, Category, Project } from '../types';

interface ExpenseFormProps {
  categories: Category[];
  projects: Project[];
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onClose: () => void;
}

import { analyzeReceipt } from '../services/geminiService';

const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, projects, onAdd, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: categories[0]?.id || '',
    projectId: projects[0]?.id || '',
    receipt: '',
    receiptFile: null as File | null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          receipt: reader.result as string,
          receiptFile: file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeReceipt = async () => {
    if (!formData.receiptFile) return;
    setAnalyzing(true);
    try {
      const data = await analyzeReceipt(formData.receiptFile);
      setFormData(prev => ({
        ...prev,
        amount: data.amount.toString(),
        date: data.date,
        description: data.description
      }));
    } catch (error) {
      alert("Não foi possível ler a nota. Tente preencher manualmente.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    onAdd({
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      categoryId: formData.categoryId,
      projectId: formData.projectId,
      receipt: formData.receipt
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Lançar Despesa</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 text-brand-green">Implantação de Unidade</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">O que foi comprado?</label>
              <input
                type="text" required
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-brand-green outline-none transition-all font-bold"
                placeholder="Ex: Jogo de brocas / Diária Hotel"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Valor (R$)</label>
                <input
                  type="number" step="0.01" required
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-brand-green outline-none font-black"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Data</label>
                <input
                  type="date" required
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-brand-green outline-none font-bold"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Obra / Unidade</label>
                <select
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-brand-green outline-none font-bold appearance-none"
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tipo de Gasto</label>
                <select
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-brand-green outline-none font-bold appearance-none"
                  value={formData.categoryId}
                  onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nota Fiscal / Comprovante</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all overflow-hidden relative group"
              >
                {formData.receipt ? (
                  <>
                    <img src={formData.receipt} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="Recibo" />
                    {!analyzing && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyzeReceipt();
                          }}
                          className="bg-brand-green text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                        >
                          ✨ Ler com IA
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="text-[10px] font-black uppercase text-slate-400">Capturar ou Anexar Foto</span>
                  </>
                )}

                {analyzing && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green mb-2"></div>
                    <span className="text-[10px] font-black uppercase text-brand-green animate-pulse">Lendo Nota...</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-green text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-green-200 dark:shadow-none"
          >
            Salvar Lançamento
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
