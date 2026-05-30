"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

export interface AssetSlice {
  symbol: string;
  value: number;
  pct: number;
}

export interface MonthlyBar {
  month: string;
  amount: number;
}

interface Props {
  totalValue: number;
  annualDividend: number;
  dividendYieldPct: number;
  assetSlices: AssetSlice[];
  monthlyBars: MonthlyBar[];
}

const PIE_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#64748b", "#f97316",
];

const fmtUSD = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(1)}K`
    : `$${n.toFixed(2)}`;

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: AssetSlice }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-900">{d.symbol}</p>
      <p className="text-slate-500">{fmtUSD(d.value)}</p>
      <p className="text-indigo-600 font-semibold">{d.pct.toFixed(1)}%</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700">{label}</p>
      <p className="text-emerald-600 font-bold">{fmtUSD(payload[0].value)}</p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-xs text-slate-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardCharts({ totalValue, annualDividend, dividendYieldPct, assetSlices, monthlyBars }: Props) {
  const hasAssets = assetSlices.length > 0;
  const hasDividends = annualDividend > 0;

  return (
    <div className="mb-8">
      {/* Section header + summary stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-base font-semibold text-slate-900">자산 현황 분석</h2>
        <div className="flex flex-wrap gap-3">
          <SummaryBadge label="전체 자산 규모" value={fmtUSD(totalValue)} color="indigo" />
          <SummaryBadge label="연간 예상 배당" value={fmtUSD(annualDividend)} color="emerald" />
          <SummaryBadge label="포트폴리오 배당률" value={`${dividendYieldPct.toFixed(2)}%`} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">종목별 자산 배분</h3>
          {!hasAssets ? (
            <EmptyState label="자산을 추가하면 배분 차트가 표시됩니다" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={assetSlices}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="symbol"
                >
                  {assetSlices.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">월별 예상 배당 수입</h3>
          <p className="text-xs text-slate-400 mb-4">Yahoo Finance 배당률 기준 추정치</p>
          {!hasDividends ? (
            <EmptyState label="배당 종목을 추가하면 월별 차트가 표시됩니다" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`)}
                  width={48}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBadge({ label, value, color }: { label: string; value: string; color: "indigo" | "emerald" | "amber" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <div className={`border rounded-xl px-4 py-2 ${colors[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-base font-bold leading-tight">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[240px]">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
