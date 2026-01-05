
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-start transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] text-brand-green dark:text-green-400 mb-6">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;
