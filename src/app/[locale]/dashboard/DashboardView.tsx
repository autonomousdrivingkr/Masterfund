"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import DashboardCharts from "./DashboardCharts";
import type { AssetSlice, MonthlyBar } from "./DashboardCharts";

type DisplayCurrency = "KRW" | "USD";

interface Asset {
  symbol: string;
  shares: number;
  avgCost: number;
  currency: string;
}

interface Portfolio {
  id: string;
  name: string;
  currency: string;
  assets: Asset[];
}

interface QuoteData {
  price: number;
  currency: string;
  dividendYield?: number;
  name?: string;
}

interface Props {
  portfolios: Portfolio[];
  quotes: Record<string, QuoteData>;
  usdKrw: number | null;
  title: string;
  labelTotalValue: string;
  labelTotalProfit: string;
  labelTotalReturn: string;
  labelMyPortfolios: string;
  labelCreatePortfolio: string;
  labelNoPortfolio: string;
}

const CUR_SYM: Record<string, string> = { KRW: "₩", USD: "$", JPY: "¥", EUR: "€", GBP: "£" };
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function DashboardView({
  portfolios, quotes, usdKrw,
  title, labelTotalValue, labelTotalProfit, labelTotalReturn,
  labelMyPortfolios, labelCreatePortfolio, labelNoPortfolio,
}: Props) {
  const [displayCur, setDisplayCur] = useState<DisplayCurrency>("KRW");

  function convert(amount: number, fromCur: string): number {
    if (!isFinite(amount)) return NaN;
    if (fromCur === displayCur) return amount;
    if (!usdKrw) return NaN;
    const inUsd =
      fromCur === "USD" ? amount :
      fromCur === "KRW" ? amount / usdKrw : NaN;
    if (isNaN(inUsd)) return NaN;
    return displayCur === "USD" ? inUsd : inUsd * usdKrw;
  }

  const sym = CUR_SYM[displayCur] ?? displayCur;

  function fmtNum(n: number) {
    if (!isFinite(n)) return "—";
    return displayCur === "KRW"
      ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  let totalValue = 0, totalCost = 0;
  for (const p of portfolios) {
    for (const a of p.assets) {
      const q = quotes[a.symbol];
      const price = q ? convert(q.price, q.currency) : NaN;
      const cost  = convert(a.avgCost, a.currency);
      if (isFinite(price)) totalValue += price * a.shares;
      if (isFinite(cost))  totalCost  += cost  * a.shares;
    }
  }
  const totalProfit = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const assetMap: Record<string, { symbol: string; value: number }> = {};
  for (const p of portfolios) {
    for (const a of p.assets) {
      const q = quotes[a.symbol];
      const val = q ? convert(q.price, q.currency) * a.shares : NaN;
      if (!isFinite(val)) continue;
      assetMap[a.symbol] = { symbol: a.symbol, value: (assetMap[a.symbol]?.value ?? 0) + val };
    }
  }
  const sorted = Object.values(assetMap).sort((a, b) => b.value - a.value);
  const top8 = sorted.slice(0, 8);
  const othersVal = sorted.slice(8).reduce((s, a) => s + a.value, 0);
  if (othersVal > 0) top8.push({ symbol: "기타", value: othersVal });
  const assetSlices: AssetSlice[] = top8.map((a) => ({
    symbol: a.symbol,
    value: a.value,
    pct: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
  }));

  const monthlyAmounts = Array(12).fill(0) as number[];
  let annualDividend = 0;
  for (const p of portfolios) {
    for (const a of p.assets) {
      const q = quotes[a.symbol];
      if (q?.dividendYield && q.dividendYield > 0 && q.price > 0) {
        const annual = convert(q.price * q.dividendYield * a.shares, q.currency);
        if (!isFinite(annual)) continue;
        annualDividend += annual;
        for (let m = 0; m < 12; m++) monthlyAmounts[m] += annual / 12;
      }
    }
  }
  const monthlyBars: MonthlyBar[] = MONTHS.map((month, i) => ({ month, amount: monthlyAmounts[i] }));
  const dividendYieldPct = totalValue > 0 ? (annualDividend / totalValue) * 100 : 0;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">포트폴리오 현황을 한눈에 확인하세요</p>
        </div>
        {/* 통화 토글 */}
        <div className="flex items-center gap-3 shrink-0">
          {usdKrw && (
            <span className="text-xs text-slate-500 hidden sm:block">
              1 USD = ₩{usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
            </span>
          )}
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1 border border-slate-700/50">
            {(["KRW", "USD"] as DisplayCurrency[]).map((c) => (
              <button
                key={c}
                onClick={() => setDisplayCur(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  displayCur === c
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {c === "KRW" ? "₩ KRW" : "$ USD"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={labelTotalValue}
          value={`${sym}${fmtNum(totalValue)}`}
          accentColor="border-t-indigo-500"
          icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
          iconBg="bg-indigo-500/15 text-indigo-400"
        />
        <StatCard
          label={labelTotalProfit}
          value={`${totalProfit >= 0 ? "+" : ""}${sym}${fmtNum(Math.abs(totalProfit))}`}
          positive={totalProfit >= 0}
          accentColor={totalProfit >= 0 ? "border-t-emerald-500" : "border-t-red-500"}
          icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          iconBg={totalProfit >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}
        />
        <StatCard
          label={labelTotalReturn}
          value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
          positive={totalReturn >= 0}
          accentColor={totalReturn >= 0 ? "border-t-amber-500" : "border-t-red-500"}
          icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          iconBg={totalReturn >= 0 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}
        />
        <StatCard
          label={labelMyPortfolios}
          value={String(portfolios.length)}
          accentColor="border-t-violet-500"
          icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          iconBg="bg-violet-500/15 text-violet-400"
        />
      </div>

      {/* 차트 */}
      <DashboardCharts
        totalValue={totalValue}
        annualDividend={annualDividend}
        dividendYieldPct={dividendYieldPct}
        assetSlices={assetSlices}
        monthlyBars={monthlyBars}
        displayCur={displayCur}
      />

      {/* 포트폴리오 목록 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">{labelMyPortfolios}</h2>
        <Link href="/dashboard/portfolio" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          {labelCreatePortfolio} →
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-12 sm:p-16 text-center">
          <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-slate-300 font-medium mb-1">{labelNoPortfolio}</p>
          <p className="text-slate-500 text-sm mb-6">첫 포트폴리오를 만들고 자산을 추가해보세요</p>
          <Link href="/dashboard/portfolio" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            {labelCreatePortfolio}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map((p) => {
            let pValue = 0, pCost = 0;
            for (const a of p.assets) {
              const q = quotes[a.symbol];
              const price = q ? convert(q.price, q.currency) : NaN;
              const cost  = convert(a.avgCost, a.currency);
              if (isFinite(price)) pValue += price * a.shares;
              if (isFinite(cost))  pCost  += cost  * a.shares;
            }
            const pProfit = pValue - pCost;
            const pReturn = pCost > 0 ? (pProfit / pCost) * 100 : 0;
            const positive = pReturn >= 0;

            return (
              <Link key={p.id} href={`/dashboard/portfolio/${p.id}` as "/dashboard"}>
                <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 hover:border-indigo-500/40 hover:bg-slate-700/50 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{p.assets.length}개 종목</p>
                    </div>
                    <span className="text-xs font-medium bg-slate-700 text-slate-400 px-2 py-1 rounded-lg ml-3 shrink-0">{displayCur}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-100 mb-3 truncate">
                    {sym}{fmtNum(pValue)}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {positive
                        ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
                      {Math.abs(pReturn).toFixed(2)}%
                    </span>
                    <span className={`text-xs ${positive ? "text-emerald-400" : "text-red-400"}`}>
                      {positive ? "+" : "−"}{sym}{fmtNum(Math.abs(pProfit))}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, positive, icon, iconBg, accentColor }: {
  label: string; value: string; positive?: boolean;
  icon: React.ReactNode; iconBg: string; accentColor: string;
}) {
  const valueColor = positive === undefined ? "text-slate-100" : positive ? "text-emerald-400" : "text-red-400";
  return (
    <div className={`bg-slate-800 rounded-2xl border border-slate-700/50 border-t-2 ${accentColor} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 leading-tight pr-2">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      </div>
      <p className={`text-xl sm:text-2xl font-bold leading-tight break-words ${valueColor}`}>{value}</p>
    </div>
  );
}
