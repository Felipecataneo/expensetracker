// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NOVO: Função para formatar números para exibição (ex: 123.45 -> R$ 123,45)
export function formatCurrency(value: string | number | undefined): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numValue === undefined || numValue === null || isNaN(numValue)) {
    return 'R$ 0,00'; // Fallback para valores inválidos/vazios
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

// NOVO: Função para formatar números para exibição em campos de input (ex: 123.45 -> 123,45)
export function formatNumberForInput(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  // Usamos toLocaleString para formatar, mas evitamos o símbolo de moeda e vírgulas de milhar por padrão para inputs simples
  return numValue.toLocaleString('pt-BR', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// NOVO: Função para parsear a entrada do usuário (com vírgula) para um formato de ponto (para cálculo e API)
export function parseInputToFloatString(value: string): string {
  if (!value) return '0.00';
  // Remove pontos de milhares e substitui a vírgula por ponto decimal
  return value.replace(/\./g, '').replace(',', '.');
}