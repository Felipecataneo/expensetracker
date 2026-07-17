// src/lib/chart-theme.ts
// Paletas de gráfico validadas para daltonismo (ΔE adjacente >= 8) em cada superfície:
// clara (card branco) e escura (card oklch(0.208 0.042 265.755) ~= #0f172b).
// Ordem fixa: a cor segue a entidade, nunca a posição — não reordenar.

export interface ChartTheme {
  accent: string; // série única / mês em destaque
  categorical: string[]; // slots em ordem fixa para séries por posição (ex.: vendedores)
  other: string; // fatia "Outros" — neutra, nunca uma cor de série
  deemphasis: string; // barras fora do mês selecionado
  grid: string; // grade recessiva (hairline sólida)
  axis: string; // linha do eixo
  tick: string; // texto de eixo (token de texto, nunca cor de série)
  deltaUpBad: string; // gasto subiu = ruim
  deltaDownGood: string; // gasto caiu = bom
}

export const CHART_THEME_LIGHT: ChartTheme = {
  accent: '#2a78d6',
  categorical: ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'],
  other: '#c3c2b7',
  deemphasis: '#d6d5cf',
  grid: '#e5e4dd',
  axis: '#c3c2b7',
  tick: '#898781',
  deltaUpBad: '#d03b3b',
  deltaDownGood: '#006300',
};

export const CHART_THEME_DARK: ChartTheme = {
  accent: '#3987e5',
  categorical: ['#3987e5', '#008300', '#d55181', '#c98500', '#199e70', '#d95926', '#9085e9', '#e66767'],
  other: '#52514e',
  deemphasis: '#3a4358',
  grid: '#2a3348',
  axis: '#3a4358',
  tick: '#8f97a8',
  deltaUpBad: '#e66767',
  deltaDownGood: '#0ca30c',
};
