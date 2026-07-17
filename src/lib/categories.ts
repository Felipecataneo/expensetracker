// src/lib/categories.ts
// Categorias de despesa com cor fixa por categoria (a cor segue a entidade, nunca a posição).
// Paleta validada para daltonismo nas superfícies clara e escura (ver lib/chart-theme).
import { Expense } from './types';

export interface Category {
  id: string;
  label: string;
  color: { light: string; dark: string };
}

export const CATEGORIES: Category[] = [
  { id: 'mercado', label: 'Mercado', color: { light: '#2a78d6', dark: '#3987e5' } },
  { id: 'alimentacao', label: 'Alimentação', color: { light: '#008300', dark: '#008300' } },
  { id: 'transporte', label: 'Transporte', color: { light: '#e87ba4', dark: '#d55181' } },
  { id: 'moradia', label: 'Moradia', color: { light: '#eda100', dark: '#c98500' } },
  { id: 'saude', label: 'Saúde', color: { light: '#1baf7a', dark: '#199e70' } },
  { id: 'lazer', label: 'Lazer', color: { light: '#eb6834', dark: '#d95926' } },
  { id: 'assinaturas', label: 'Assinaturas', color: { light: '#4a3aa7', dark: '#9085e9' } },
  { id: 'compras', label: 'Compras', color: { light: '#e34948', dark: '#e66767' } },
  { id: 'outros', label: 'Outros', color: { light: '#898781', dark: '#898781' } },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: string | undefined): Category {
  return (id && CATEGORY_BY_ID.get(id)) || CATEGORY_BY_ID.get('outros')!;
}

/** Remove acentos e baixa a caixa para casar palavras-chave. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Regras de inferência por palavra-chave no nome do vendedor. A ordem importa:
// a primeira regra que casar vence (ex.: "mercado livre" deve cair em Compras
// antes de "mercado" casar com a categoria Mercado).
const INFERENCE_RULES: Array<{ category: string; pattern: RegExp }> = [
  {
    category: 'assinaturas',
    pattern:
      /netflix|spotify|prime video|amazon prime|disney|hbo|globoplay|youtube premium|deezer|crunchyroll|icloud|google one|apple\.com|assinatura/,
  },
  {
    category: 'compras',
    pattern:
      /mercado ?livre|amazon|magalu|magazine|americanas|casas bahia|shopee|aliexpress|shein|renner|riachuelo|c&a|zara|centauro|decathlon|leroy|madeira ?madeira|kabum|loja/,
  },
  {
    category: 'mercado',
    pattern:
      /supermercado|mercado|atacad|sacolao|hortifruti|pao de acucar|carrefour|assai|zaffari|angeloni|bistek|fort atacadista|emporio|quitanda/,
  },
  {
    category: 'transporte',
    pattern:
      /\buber\b|99 ?(app|pop|taxi)|taxi|posto|shell|ipiranga|petrobras|combustivel|gasolina|estacionamento|pedagio|sem parar|veloe|conectcar|metro|onibus|passagem|latam|gol linhas|azul linhas/,
  },
  {
    category: 'saude',
    pattern:
      /farmacia|drogaria|droga ?raia|drogasil|pacheco|panvel|pague menos|hospital|clinica|medic|dentista|laborator|unimed|amil|hapvida|plano de saude|academia|smart ?fit/,
  },
  {
    category: 'moradia',
    pattern:
      /aluguel|condominio|imobiliaria|energia|\bluz\b|enel|cpfl|cemig|copel|celesc|light\b|\bagua\b|sabesp|sanepar|casan|sanea|\bgas\b|comgas|internet|vivo|claro|tim\b|\boi\b|iptu|seguro residencial/,
  },
  {
    category: 'alimentacao',
    pattern:
      /ifood|rappi|restaurante|lanch|pizza|burger|hamburg|padaria|cafeteria|\bcafe\b|churrasc|sushi|acai|sorvete|doceria|confeitaria|bar\b|boteco|espetinho|pastel/,
  },
  {
    category: 'lazer',
    pattern:
      /cinema|cinemark|ingresso|show|teatro|viagem|hotel|pousada|airbnb|booking|parque|steam|playstation|xbox|nintendo|jogo/,
  },
];

/** Infere a categoria pelo nome do vendedor. Retorna "outros" quando nada casa. */
export function inferCategory(vendor: string | undefined): string {
  if (!vendor) return 'outros';
  const normalized = normalize(vendor);
  for (const rule of INFERENCE_RULES) {
    if (rule.pattern.test(normalized)) return rule.category;
  }
  return 'outros';
}

/**
 * Categoria efetiva de uma despesa: a escolhida manualmente quando válida,
 * senão a inferida pelo vendedor. Assim, despesas antigas (sem o campo) e
 * recibos processados por OCR também ganham categoria.
 */
export function getEffectiveCategory(expense: Expense): Category {
  if (expense.category && CATEGORY_BY_ID.has(expense.category)) {
    return CATEGORY_BY_ID.get(expense.category)!;
  }
  return getCategory(inferCategory(expense.vendor));
}
