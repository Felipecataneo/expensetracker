// src/hooks/useChartTheme.ts
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { CHART_THEME_DARK, CHART_THEME_LIGHT, ChartTheme } from '@/lib/chart-theme';

/**
 * Retorna a paleta de gráfico do tema ativo. Devolve a paleta clara até o
 * componente montar, para o primeiro render do cliente bater com o SSR
 * (evita erro de hidratação); os gráficos trocam de cor logo em seguida.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && resolvedTheme === 'dark' ? CHART_THEME_DARK : CHART_THEME_LIGHT;
}

/** Versão para cores por entidade (categorias): escolhe light/dark do par. */
export function useThemeMode(): 'light' | 'dark' {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
}
