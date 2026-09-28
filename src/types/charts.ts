/**
 * Tipos compartilhados pelos gráficos. Mantidos em um único módulo para que
 * hooks, utilitários e componentes falem a mesma língua sem dependência
 * circular.
 */

/** Métricas disponíveis no dashboard. */
export type SeriesKey = "revenue" | "users" | "conversions";

/** Unidade de exibição de uma métrica. */
export type MetricUnit = "currency" | "count";

/** Ponto de dado usado pelos gráficos de barras e de linhas. */
export type DataPoint = {
  /** Identificador estável — usado como chave nas seleções do D3. */
  id: string;
  /** Rótulo curto para eixo/tooltip. */
  label: string;
  /** Valor principal da métrica. */
  value: number;
  /** Valor de comparação (período anterior / referência). */
  comparison: number;
  /** Instante do dado em epoch ms — define a posição no eixo temporal. */
  timestamp: number;
};

/** Fatia do gráfico de pizza (distribuição por métrica). */
export type PieDatum = {
  id: string;
  label: string;
  value: number;
  series: SeriesKey;
};

/** Conjunto completo consumido pela página. */
export type ChartDataset = {
  /** Índice do tick atual (0 = carga inicial; cada tick avança a janela). */
  tick: number;
  /** Instante de referência da geração. */
  generatedAt: number;
  /** Séries temporais por métrica (gráfico de linhas). */
  timelines: Record<SeriesKey, DataPoint[]>;
  /** Agregação por etapa do funil (gráfico de barras). */
  stages: Record<SeriesKey, DataPoint[]>;
  /** Distribuição por métrica (gráfico de pizza). */
  distribution: PieDatum[];
};

/** Dimensões medidas do container do gráfico. */
export type ChartDimensions = {
  width: number;
  height: number;
};

/** Linha do tooltip. */
export type TooltipRow = {
  label: string;
  value: string;
};

/** Estado do tooltip compartilhado entre os três gráficos. */
export type ChartTooltipState = {
  visible: boolean;
  /** Posição relativa ao container do gráfico, em px. */
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
};

/** Transformação de zoom aplicada a um eixo. */
export type ZoomTransformState = {
  k: number;
  x: number;
  y: number;
};

/** Domínio numérico fechado `[min, max]`. */
export type NumericDomain = [number, number];

/** Item da legenda compartilhada pelos gráficos. */
export type ChartLegendItem = {
  id: string;
  label: string;
  /** Classe global de série (`ds-series-*`) que define a cor. */
  className: string;
  value?: string;
  series?: SeriesKey;
};

/** Direção da tendência exibida no destaque de um cartão. */
export type ChartCardTrend = "up" | "down" | "flat";

/** Destaque numérico exibido no cabeçalho de um cartão. */
export type ChartCardHighlight = {
  label: string;
  value: string;
  /** Variação já formatada (ex.: "+12,4%"). */
  variation?: string;
  trend?: ChartCardTrend;
};

/** Props do gráfico de barras. */
export type BarChartProps = {
  points: readonly DataPoint[];
  metric: SeriesKey;
  title: string;
  description: string;
  height?: number;
  duration?: number;
  selectedId?: string | null;
  onSelect?: (point: DataPoint) => void;
};

/** Props do gráfico de linhas. */
export type LineChartProps = {
  points: readonly DataPoint[];
  metric: SeriesKey;
  title: string;
  description: string;
  height?: number;
  duration?: number;
  /** Limite de ampliação do zoom. */
  maxZoom?: number;
};

/** Props do gráfico de pizza. */
export type PieChartProps = {
  data: readonly PieDatum[];
  title: string;
  description: string;
  height?: number;
  duration?: number;
  selectedSeries?: SeriesKey | null;
  /** Chamado ao clicar numa fatia (filtra a série do gráfico de linhas). */
  onSelect?: (series: SeriesKey) => void;
  showLegend?: boolean;
};
