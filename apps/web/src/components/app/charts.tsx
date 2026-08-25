'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Charts are part of the product, not a library dropped into a card.
 *
 * Rules applied throughout:
 *   · series colours come from the chart tokens, so charts re-theme with the app
 *   · no axis lines or tick marks — the grid does that job, faintly
 *   · horizontal rules only; vertical rules add noise to a time series
 *   · the tooltip is the same popover surface used everywhere else
 *   · entrance animation once, on mount, then still
 */
const PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const colorAt = (index: number): string => PALETTE[index % PALETTE.length] as string;

const GRID = 'hsl(var(--border-subtle))';

const axisProps = {
  stroke: 'hsl(var(--subtle-foreground))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid hsl(var(--border-subtle))',
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
  padding: '8px 10px',
  boxShadow: '0 12px 32px -8px rgb(0 0 0 / 0.7)',
} as const;

const tooltipShared = {
  contentStyle: tooltipStyle,
  itemStyle: { padding: '2px 0' },
  labelStyle: { color: 'hsl(var(--subtle-foreground))', marginBottom: 4, fontSize: 11 },
  // A faint band beats a vertical line for scanning a dense series.
  cursor: { fill: 'hsl(var(--surface-hover))', opacity: 0.6 },
} as const;

const legendStyle = { fontSize: 12, color: 'hsl(var(--muted-foreground))', paddingTop: 8 } as const;

const ANIMATION = { animationDuration: 700, animationEasing: 'ease-out' } as const;

export function TrendAreaChart({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string }[];
  height?: number;
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {series.map((entry, index) => (
            <linearGradient key={entry.key} id={`gridx-area-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorAt(index)} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colorAt(index)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis width={44} {...axisProps} />
        <Tooltip {...tooltipShared} cursor={{ stroke: GRID, strokeWidth: 1 }} />
        {series.length > 1 ? <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} /> : null}
        {series.map((entry, index) => (
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={colorAt(index)}
            fill={`url(#gridx-area-${entry.key})`}
            strokeWidth={1.75}
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            {...ANIMATION}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  xKey,
  valueKey,
  label,
  horizontal = false,
  height = 260,
  /** Single-hue bars read as one measure; multi-hue implies separate series. */
  monochrome = false,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  valueKey: string;
  label: string;
  horizontal?: boolean;
  height?: number;
  monochrome?: boolean;
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 8, left: horizontal ? 8 : -16, bottom: 0 }}
      >
        <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey={xKey} width={140} {...axisProps} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis width={44} {...axisProps} />
          </>
        )}
        <Tooltip {...tooltipShared} />
        <Bar
          dataKey={valueKey}
          name={label}
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          maxBarSize={horizontal ? 18 : 44}
          {...ANIMATION}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={monochrome ? colorAt(0) : colorAt(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionPieChart({
  data,
  nameKey,
  valueKey,
  height = 260,
}: {
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  height?: number;
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={2}
          // Segment gaps read as gaps only when they match the canvas.
          stroke="hsl(var(--card))"
          strokeWidth={2}
          {...ANIMATION}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={colorAt(index)} />
          ))}
        </Pie>
        <Tooltip {...tooltipShared} cursor={false} />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={7} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleLineChart({
  data,
  xKey,
  valueKey,
  label,
  height = 220,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  valueKey: string;
  label: string;
  height?: number;
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis width={44} {...axisProps} />
        <Tooltip {...tooltipShared} cursor={{ stroke: GRID, strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey={valueKey}
          name={label}
          stroke={colorAt(0)}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
          {...ANIMATION}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * A chart's frame. Keeps the title, optional action and body on one rhythm
 * so a dashboard of mixed visualisations still reads as a single grid.
 */
export function ChartFrame({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <section
      className={`rounded-card bg-card p-4 shadow-hairline surface-sheen ${className ?? ''}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 className="type-card-title truncate">{title}</h3>
          {description ? <p className="text-[0.75rem] text-subtle">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
