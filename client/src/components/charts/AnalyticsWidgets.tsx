import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const CHART_NAVY = '#1e293b';
export const CHART_ORANGE = '#f97316';
export const DONUT_PALETTE = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#f97316', // Orange
  '#10b981', // Emerald
];

interface DarkTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  valueSuffix?: string;
}

export function DarkChartTooltip({
  active,
  payload,
  label,
  valueSuffix = '',
}: DarkTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl border border-slate-700">
      {label ? (
        <p className="mb-1 font-semibold text-slate-300">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: entry.color || CHART_ORANGE }}
            />
            <span className="text-slate-300">{entry.name}:</span>
            <span className="font-bold text-white">
              {entry.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface KpiMetricItem {
  label: string;
  value: string | number;
  trendText: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

export function CompactKpiCard({
  label,
  value,
  trendText,
  trendDirection = 'up',
}: KpiMetricItem): React.ReactElement {
  return (
    <Card className="border-slate-200/90 shadow-sm hover:shadow transition-shadow">
      <CardContent className="p-4 space-y-1.5">
        <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>
        <div className="flex items-center gap-1 text-[11px] font-medium">
          {trendDirection === 'up' ? (
            <span className="inline-flex items-center gap-0.5 text-emerald-600">
              <ArrowUpRight className="h-3 w-3 shrink-0" />
              {trendText}
            </span>
          ) : trendDirection === 'down' ? (
            <span className="inline-flex items-center gap-0.5 text-rose-600">
              <ArrowDownRight className="h-3 w-3 shrink-0" />
              {trendText}
            </span>
          ) : (
            <span className="text-slate-400">{trendText}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SemiCircleGaugeCardProps {
  title: string;
  score: number; // 0 to 100
  statusLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Semi-circular gauge chart (0..100 scale ticks + emerald arc + needle pointer)
 * matching the SmartLedger "Company Health" gauge card.
 */
export function SemiCircleGaugeCard({
  title,
  score,
  statusLabel,
  actionLabel = 'More details',
  onAction,
}: SemiCircleGaugeCardProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const resolvedStatus =
    statusLabel ||
    (clamped >= 80
      ? 'Excellent'
      : clamped >= 60
      ? 'Good'
      : clamped >= 40
      ? 'Fair'
      : 'Building');

  const cx = 110;
  const cy = 102;
  const r = 74;
  const circumference = Math.PI * r;
  const progressLength = (clamped / 100) * circumference;

  // Angle from 180deg (left, score=0) to 0deg (right, score=100)
  const needleAngleDeg = 180 - (clamped / 100) * 180;
  const needleAngleRad = (needleAngleDeg * Math.PI) / 180;
  const needleInnerR = r - 15;
  const needleOuterR = r + 13;
  const nx1 = cx + needleInnerR * Math.cos(needleAngleRad);
  const ny1 = cy - needleInnerR * Math.sin(needleAngleRad);
  const nx2 = cx + needleOuterR * Math.cos(needleAngleRad);
  const ny2 = cy - needleOuterR * Math.sin(needleAngleRad);

  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <Card className="flex flex-col justify-between border-slate-200/90 shadow-sm">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-slate-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-between px-5 pb-4 pt-1">
        <svg
          viewBox="0 0 220 122"
          className="w-full max-w-[220px] overflow-visible"
          aria-label={`${title}: ${clamped} (${resolvedStatus})`}
        >
          {/* Scale labels 0..100 around outer arc */}
          {ticks.map((t) => {
            const deg = 180 - (t / 100) * 180;
            const rad = (deg * Math.PI) / 180;
            const labelR = r + 18;
            const lx = cx + labelR * Math.cos(rad);
            const ly = cy - labelR * Math.sin(rad);
            return (
              <text
                key={t}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-400 text-[7.5px] font-medium"
              >
                {t}
              </text>
            );
          })}

          {/* Track semicircle */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#d1fae5"
            strokeWidth={18}
            strokeLinecap="butt"
          />

          {/* Active emerald progress semicircle */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#10b981"
            strokeWidth={18}
            strokeDasharray={`${progressLength} ${circumference}`}
            strokeLinecap="butt"
          />

          {/* Pointer needle Pill */}
          <line
            x1={nx1}
            y1={ny1}
            x2={nx2}
            y2={ny2}
            stroke="#065f46"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <line
            x1={nx1}
            y1={ny1}
            x2={nx2}
            y2={ny2}
            stroke="#ecfdf5"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Center Score & Status */}
          <text
            x={cx}
            y={cy - 18}
            textAnchor="middle"
            className="fill-emerald-600 text-2xl font-extrabold"
          >
            {clamped}
          </text>
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            className="fill-emerald-600 text-xs font-bold"
          >
            {resolvedStatus}
          </text>
        </svg>

        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 w-full rounded-lg bg-indigo-50/80 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-100/80 transition-colors"
          >
            {actionLabel}
          </button>
        ) : (
          <div className="mt-2 w-full rounded-lg bg-indigo-50/70 py-2 text-center text-xs font-semibold text-slate-700">
            {actionLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GroupedBarChartCardProps {
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  primaryKey: string;
  primaryLabel: string;
  secondaryKey: string;
  secondaryLabel: string;
  yAxisLabel?: string;
}

export function GroupedBarChartCard({
  title,
  data,
  xKey,
  primaryKey,
  primaryLabel,
  secondaryKey,
  secondaryLabel,
}: GroupedBarChartCardProps): React.ReactElement {
  return (
    <Card className="border-slate-200/90 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-slate-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <Tooltip content={<DarkChartTooltip />} />
              <Bar
                dataKey={primaryKey}
                name={primaryLabel}
                fill={CHART_NAVY}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
              <Bar
                dataKey={secondaryKey}
                name={secondaryLabel}
                fill={CHART_ORANGE}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-center gap-5 text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-3.5 rounded-sm"
              style={{ backgroundColor: CHART_NAVY }}
            />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-3.5 rounded-sm"
              style={{ backgroundColor: CHART_ORANGE }}
            />
            {secondaryLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface DonutBreakdownCardProps {
  title: string;
  data: Array<{ name: string; value: number }>;
}

export function DonutBreakdownCard({
  title,
  data,
}: DonutBreakdownCardProps): React.ReactElement {
  const safeData =
    data.length > 0 && data.some((d) => d.value > 0)
      ? data
      : [{ name: 'No Data Yet', value: 1 }];

  return (
    <Card className="border-slate-200/90 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-slate-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="h-52 w-full sm:w-3/5">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={78}
                  paddingAngle={1.5}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {safeData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={DONUT_PALETTE[idx % DONUT_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DarkChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full sm:w-2/5 space-y-2 pr-1">
            {safeData.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-4 shrink-0 rounded-sm"
                    style={{
                      backgroundColor:
                        DONUT_PALETTE[idx % DONUT_PALETTE.length],
                    }}
                  />
                  <span className="truncate text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800 shrink-0">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SplitBarComparisonCardProps {
  title: string;
  badgeText: string;
  primaryLabel: string;
  primaryValue: number;
  primaryDisplay: string;
  secondaryLabel: string;
  secondaryValue: number;
  secondaryDisplay: string;
  detailsTitle: string;
  details: Array<{ label: string; value: string | number }>;
}

/**
 * Horizontal two-tone stacked bar card matching SmartLedger's
 * "All Receivables" / "All Payables" cards.
 */
export function SplitBarComparisonCard({
  title,
  badgeText,
  primaryLabel,
  primaryValue,
  primaryDisplay,
  secondaryLabel,
  secondaryValue,
  secondaryDisplay,
  detailsTitle,
  details,
}: SplitBarComparisonCardProps): React.ReactElement {
  const total = Math.max(1, primaryValue + secondaryValue);
  const primaryPct = Math.round((primaryValue / total) * 100);
  const secondaryPct = Math.max(0, 100 - primaryPct);

  return (
    <Card className="border-slate-200/90 shadow-sm">
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900">{title}</h4>
          <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span
              className="inline-block h-2 w-2 rounded-xs"
              style={{ backgroundColor: CHART_ORANGE }}
            />
            {badgeText}
          </span>
        </div>

        {/* Stacked Horizontal Split Bar */}
        <div className="flex h-5 w-full overflow-hidden rounded-sm bg-slate-100">
          <div
            style={{
              width: `${primaryValue === 0 && secondaryValue === 0 ? 50 : primaryPct}%`,
              backgroundColor: CHART_NAVY,
            }}
            className="h-full transition-all"
          />
          <div
            style={{
              width: `${primaryValue === 0 && secondaryValue === 0 ? 50 : secondaryPct}%`,
              backgroundColor: CHART_ORANGE,
            }}
            className="h-full transition-all"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2.5 rounded-xs"
              style={{ backgroundColor: CHART_NAVY }}
            />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2.5 rounded-xs"
              style={{ backgroundColor: CHART_ORANGE }}
            />
            {secondaryLabel}
          </span>
        </div>

        {/* 2-Column Breakdown */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px]">
          <div className="space-y-1">
            <div>
              <p className="text-slate-500 font-medium">{primaryLabel}:</p>
              <p className="font-bold text-slate-900">{primaryDisplay}</p>
            </div>
            <div>
              <p className="text-amber-600 font-medium">{secondaryLabel}:</p>
              <p className="font-bold text-amber-600">{secondaryDisplay}</p>
            </div>
          </div>
          <div className="border-l border-slate-100 pl-2 space-y-0.5">
            <p className="font-semibold text-amber-600">{detailsTitle}</p>
            {details.map((d) => (
              <p key={d.label} className="text-[10px] text-slate-600 truncate">
                {d.label}: <strong className="text-slate-800">{d.value}</strong>
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DualMetricAreaTrendCardProps {
  title: string;
  leftMetricLabel: string;
  leftMetricValue: string | number;
  rightMetricLabel: string;
  rightMetricValue: string | number;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  yLabel: string;
}

/**
 * Area / Line Trend chart card with dual top summary KPIs, dark navy line,
 * soft gradient fill, and orange vertex dots matching SmartLedger's "Cash Flow" card.
 */
export function DualMetricAreaTrendCard({
  title,
  leftMetricLabel,
  leftMetricValue,
  rightMetricLabel,
  rightMetricValue,
  data,
  xKey,
  yKey,
  yLabel,
}: DualMetricAreaTrendCardProps): React.ReactElement {
  return (
    <Card className="border-slate-200/90 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2 pt-4 px-5 space-y-2">
        <CardTitle className="text-sm font-bold text-slate-900">
          {title}
        </CardTitle>
        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2.5">
          <div>
            <p className="text-xs font-semibold text-emerald-600">
              {leftMetricLabel}
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {leftMetricValue}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <p className="text-xs font-semibold text-rose-500">
              {rightMetricLabel}
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {rightMetricValue}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="navyTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_NAVY} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CHART_NAVY} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <Tooltip content={<DarkChartTooltip />} />
              <Area
                type="linear"
                dataKey={yKey}
                name={yLabel}
                stroke={CHART_NAVY}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#navyTrendFill)"
                dot={{
                  r: 3.5,
                  fill: CHART_ORANGE,
                  stroke: CHART_ORANGE,
                  strokeWidth: 1,
                }}
                activeDot={{
                  r: 5,
                  fill: CHART_ORANGE,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
