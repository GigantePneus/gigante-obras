
export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  projectId: string;
  receipt?: string; // Base64 image
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'em_andamento' | 'concluido';
}

export type Theme = 'light' | 'dark';
