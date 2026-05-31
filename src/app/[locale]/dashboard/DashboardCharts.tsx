"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
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
  displayCur?: string;
}

const PIE_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#64748b", "#f97316",
];

function fmtUSD(n: number, cur = "USD") {
  const s = cur === "KRW" ? "₩" : "$";
  const isKrw = cur === "KRW";
  if (n >= 1_000_000_000 && isKrw) return `${s}${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${s}${(n / 1_000_000).toFixed(isKrw ? 0 : 2)}M`;
  if (n >= 1_000)     return `${s}${(n / 1_000).toFixed(isKrw ? 0 : 1)}K`;
  return isKrw ? `${s}${n.toFixed(0)}` : `${s}${n.toFixed(2)}`;
}

function PieTooltip({ active, payload, cur }: { active?: boolean; payload?: { name: string; value: number; payload: AssetSlice }[]; cur?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-bold text-slate-100">{d.symbol}</p>
      <p className="text-slate-400">{fmtUSD(d.value, cur)}</p>
      <p className="text-indigo-400 font-semibold">{d.pct.toFixed(1)}%</p>
    </div>
  );
}

function BarTooltip({ active, payload, label, cur }: { active?: boolean; payload?: { value: number }[]; label?: string; cur?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-300">{label}</p>
      <p className="text-emerald-400 font-bold">{fmtUSD(payload[0].value, cur)}</p>
    </div>
  );
}


export default function DashboardCharts({ totalValue, annualDividend, dividendYieldPct, assetSlices, monthlyBars, displayCur = "USD" }: Props) {
  const hasAssets = assetSlices.length > 0;
  const hasDividends = annualDividend > 0;

  return (
    <div className="mb-8">
      {/* Section header + summary badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-sm font-semibold text-slate-300">자산 현황 분석</h2>
        <div className="flex flex-wrap gap-2">
          <SummaryBadge label="전체 자산" value={fmtUSD(totalValue, displayCur)} color="indigo" />
          <SummaryBadge label="연간 배당" value={fmtUSD(annualDividend, displayCur)} color="emerald" />
          <SummaryBadge label="배당률" value={`${dividendYieldPct.toFixed(2)}%`} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">종목별 자산 배분</h3>
          {!hasAssets ? (
            <EmptyState label="자산을 추가하면 배분 차트가 표시됩니다" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="shrink-0" style={{ width: 180, height: 180 }}>
                <PieChart width={180} height={180}>
                  <Pie
                    data={assetSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="symbol"
                    strokeWidth={0}
                  >
                    {assetSlices.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip cur={displayCur} />} />
                </PieChart>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {[...assetSlices]
                  .sort((a, b) => b.pct - a.pct)
                  .map((slice) => (
                    <div key={slice.symbol} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[assetSlices.indexOf(slice) % PIE_COLORS.length] }}
                      />
                      <span className="text-xs text-slate-400 truncate flex-1">{slice.symbol}</span>
                      <span className="text-xs font-semibold text-slate-200 shrink-0 tabular-nums">
                        {slice.pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">월별 예상 배당 수입</h3>
          <p className="text-xs text-slate-500 mb-4">Yahoo Finance 배당률 기준 추정치</p>
          {!hasDividends ? (
            <EmptyState label="배당 종목을 추가하면 월별 차트가 표시됩니다" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtUSD(v, displayCur)}
                  width={48}
                />
                <Tooltip content={<BarTooltip cur={displayCur} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
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
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <div className={`border rounded-xl px-3 py-2 ${colors[color]}`}>
      <p className="text-[10px] opacity-70">{label}</p>
      <p className="text-sm font-bold leading-tight">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[240px]">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
