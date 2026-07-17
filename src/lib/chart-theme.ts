// src/lib/chart-theme.ts
// Paleta de gráficos validada para daltonismo (ΔE adjacente >= 8) e superfície clara.
// Ordem fixa: a cor segue a entidade, nunca a posição — não reordenar.

export const CHART_ACCENT = '#2a78d6'; // série única / mês em destaque

// Cores categóricas em ordem fixa (slots 1-5) para o gráfico de vendedores.
export const CATEGORICAL_COLORS = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a'];

export const OTHER_COLOR = '#c3c2b7'; // fatia "Outros" — neutra, nunca uma cor de série
export const DEEMPHASIS_COLOR = '#d6d5cf'; // barras fora do mês selecionado

// Cromo do gráfico: grade e eixos recessivos, texto em tokens de texto (nunca na cor da série).
export const GRID_COLOR = '#e5e4dd';
export const AXIS_COLOR = '#c3c2b7';
export const TICK_COLOR = '#898781';

// Cores de variação (texto): gasto subiu = ruim (vermelho), caiu = bom (verde).
export const DELTA_UP_BAD = '#d03b3b';
export const DELTA_DOWN_GOOD = '#006300';
