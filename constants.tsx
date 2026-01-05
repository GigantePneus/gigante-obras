
import { Category, Project } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Materiais (Tinta/Elétrica)', color: '#009739' },
  { id: 'cat-2', name: 'Hospedagem / Hotéis', color: '#002776' },
  { id: 'cat-3', name: 'Alimentação Equipe', color: '#FFDF00' },
  { id: 'cat-4', name: 'Transporte / Combustível', color: '#64748b' },
  { id: 'cat-5', name: 'Ferramentas de Obra', color: '#ef4444' },
  { id: 'cat-6', name: 'EPIs e Segurança', color: '#f59e0b' }
];

export const INITIAL_PROJECTS: Project[] = [
  { id: 'p-1', name: 'Montagem Unidade Osasco', status: 'em_andamento' },
  { id: 'p-2', name: 'Implantação Filial Curitiba', status: 'em_andamento' }
];

export const BRAND_LOGO_WHITE = '/logo-white.png'; // Para fundo escuro (Dark Mode)
export const BRAND_LOGO_DARK = '/logo-dark.png';   // Para fundo claro (Light Mode)
