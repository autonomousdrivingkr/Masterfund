"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import AddAssetModal from "./AddAssetModal";
import EditAssetModal from "./EditAssetModal";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  shares: number;
  avgCost: number;
  currency: string;
}

interface Quote {
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  name: string;
}

export default function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [fxRates, setFxRates] = useState<Record<string, number>>({}); // e.g. "USDKRW=X" → 1450
  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);

  async function fetchAssets() {
    const res = await fetch(`/api/portfolio/${id}/assets-list`);
    if (!res.ok) return;
    const data: Asset[] = await res.json();
    setAssets(data);
    if (data.length === 0) return;

    const symbols = [...new Set(data.map((a) => a.symbol))].join(",");
    const qRes = await fetch(`/api/market/quote?symbols=${symbols}`);
    if (!qRes.ok) return;
    const fetchedQuotes: Record<string, Quote> = await qRes.json();
    setQuotes(fetchedQuotes);

    // 통화가 다른 자산이 있으면 환율 조회
    const neededPairs = new Set<string>();
    for (const asset of data) {
      const q = fetchedQuotes[asset.symbol];
      if (q?.currency && asset.currency && q.currency !== asset.currency) {
        // "USDKRW=X" → 1 USD 당 KRW 수
        neededPairs.add(`${q.currency}${asset.currency}=X`);
      }
    }
    if (neededPairs.size === 0) return;

    const fxRes = await fetch(`/api/market/quote?symbols=${[...neededPairs].join(",")}`);
    if (!fxRes.ok) return;
    const fxData: Record<string, Quote> = await fxRes.json();
    const rates: Record<string, number> = {};
    for (const pair of neededPairs) {
      if (fxData[pair]?.price) rates[pair] = fxData[pair].price;
    }
    setFxRates(rates);
  }

  useEffect(() => { fetchAssets(); }, [id]);

  const fmtNum = (n: number, cur: string) =>
    (cur === "KRW" || cur === "JPY")
      ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currSym = (cur: string) =>
    cur === "KRW" ? "₩" : cur === "JPY" ? "¥" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : "$";

  // avgCost를 현재가 통화(quoteCur)로 환산
  function convertAvgCost(avgCost: number, assetCur: string, quoteCur: string): number {
    if (assetCur === quoteCur) return avgCost;
    const pair = `${quoteCur}${assetCur}=X`; // e.g. USDKRW=X
    const rate = fxRates[pair];
    if (!rate) return NaN; // 환율 미확인 → 수익률 미표시
    return avgCost / rate; // KRW → USD: divide by USDKRW rate
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("portfolio.assets")}</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("asset.title")}
        </button>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/50">
            <tr className="text-xs text-slate-400 uppercase tracking-wide">
              <th className="text-left px-6 py-4">{t("asset.symbol")}</th>
              <th className="text-right px-6 py-4">{t("asset.shares")}</th>
              <th className="text-right px-6 py-4">{t("asset.avgCost")}</th>
              <th className="text-right px-6 py-4">{t("asset.currentPrice")}</th>
              <th className="text-right px-6 py-4">{t("portfolio.value")}</th>
              <th className="text-right px-6 py-4">{t("portfolio.return")}</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {assets.map((asset) => {
              const q = quotes[asset.symbol];
              const quoteCur = q?.currency ?? asset.currency ?? "USD";
              const curPrice = q?.price ?? null;
              const value = curPrice !== null ? curPrice * asset.shares : null;

              // 수익률: avgCost를 현재가 통화로 환산 후 계산
              const avgCostConverted = curPrice !== null
                ? convertAvgCost(asset.avgCost, asset.currency, quoteCur)
                : NaN;
              const ret = !isNaN(avgCostConverted) && avgCostConverted > 0 && curPrice !== null
                ? ((curPrice - avgCostConverted) / avgCostConverted) * 100
                : null;

              return (
                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{asset.symbol}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[160px]">{asset.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700">{asset.shares}</td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {currSym(asset.currency)}{fmtNum(asset.avgCost, asset.currency)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700 font-medium">
                    {curPrice !== null
                      ? <span>{currSym(quoteCur)}{fmtNum(curPrice, quoteCur)}</span>
                      : <span className="text-slate-300 text-xs">조회 중</span>}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {value !== null
                      ? `${currSym(quoteCur)}${fmtNum(value, quoteCur)}`
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold ${
                    ret === null ? "text-slate-300" : ret >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {ret === null
                      ? <span className="text-xs">환율 조회 중</span>
                      : `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setEditAsset(asset)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="수정"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="text-slate-400 text-sm">아직 자산이 없습니다.</p>
                  <p className="text-slate-300 text-xs mt-1">위 버튼을 눌러 종목을 추가해보세요.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddAssetModal
          portfolioId={id}
          onSuccess={fetchAssets}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editAsset && (
        <EditAssetModal
          portfolioId={id}
          asset={editAsset}
          onSuccess={fetchAssets}
          onClose={() => setEditAsset(null)}
        />
      )}
    </div>
  );
}
