// src/lib/expense-utils.ts
// Funções puras de agregação de despesas, compartilhadas entre KPIs, gráficos e listas.
import { Expense } from './types';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Extrai a chave de mês "YYYY-MM" de uma data "YYYY-MM-DD" (sem parsing de timezone). */
export function getMonthKey(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7);
}

/** "2025-03" -> "mar/25" ou "março de 2025" */
export function formatMonthLabel(monthKey: string, style: 'short' | 'long' = 'short'): string {
  try {
    const date = parseISO(`${monthKey}-01`);
    const label = format(date, style === 'short' ? 'MMM/yy' : "MMMM 'de' yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthKey;
  }
}

/** Total numérico de uma despesa (0 para valores inválidos). */
export function expenseTotal(expense: Expense): number {
  const n = parseFloat(expense.total || '0');
  return isNaN(n) ? 0 : n;
}

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  total: number;
  count: number;
}

/** Totais por mês, ordenados do mais antigo ao mais recente, com meses vazios preenchidos. */
export function getMonthlyTotals(expenses: Expense[]): MonthlyTotal[] {
  const map = new Map<string, { total: number; count: number }>();

  expenses.forEach((expense) => {
    const key = getMonthKey(expense.date);
    if (!key) return;
    const entry = map.get(key) || { total: 0, count: 0 };
    entry.total += expenseTotal(expense);
    entry.count += 1;
    map.set(key, entry);
  });

  const keys = Array.from(map.keys()).sort();
  if (keys.length === 0) return [];

  // Preenche meses sem lançamentos entre o primeiro e o último, para o eixo do tempo não "pular".
  const result: MonthlyTotal[] = [];
  const [startYear, startMonth] = keys[0].split('-').map(Number);
  const [endYear, endMonth] = keys[keys.length - 1].split('-').map(Number);
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const entry = map.get(key);
    result.push({
      month: key,
      total: entry ? parseFloat(entry.total.toFixed(2)) : 0,
      count: entry ? entry.count : 0,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

export interface VendorTotal {
  vendor: string;
  total: number;
  count: number;
}

/** Totais por vendedor, do maior para o menor. */
export function getVendorTotals(expenses: Expense[]): VendorTotal[] {
  const map = new Map<string, { total: number; count: number }>();

  expenses.forEach((expense) => {
    const vendor = expense.vendor?.trim() || 'Sem vendedor';
    const entry = map.get(vendor) || { total: 0, count: 0 };
    entry.total += expenseTotal(expense);
    entry.count += 1;
    map.set(vendor, entry);
  });

  return Array.from(map.entries())
    .map(([vendor, { total, count }]) => ({ vendor, total: parseFloat(total.toFixed(2)), count }))
    .sort((a, b) => b.total - a.total);
}

/** Lista de meses disponíveis nas despesas, do mais recente ao mais antigo. */
export function getAvailableMonths(expenses: Expense[]): string[] {
  const set = new Set<string>();
  expenses.forEach((expense) => {
    const key = getMonthKey(expense.date);
    if (key) set.add(key);
  });
  return Array.from(set).sort().reverse();
}

/** Filtra despesas por mês ("all" retorna tudo). */
export function filterByMonth(expenses: Expense[], month: string): Expense[] {
  if (month === 'all') return expenses;
  return expenses.filter((expense) => getMonthKey(expense.date) === month);
}

/** Formata moeda em notação compacta para eixos de gráfico (ex.: R$ 1,2 mil). */
export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
