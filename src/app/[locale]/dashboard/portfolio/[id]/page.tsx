"use client";

import { useState, useEffect, use, useCallback } from "react";
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
  currency: string;
  name: string;
}

type DisplayCurrency = "KRW" | "USD";

const CUR_SYM: Record<string, string> = { KRW: "₩", USD: "$", JPY: "¥", EUR: "€", GBP: "£" };

function fmtNum(n: number, cur: string) {
  if (!isFinite(n)) return "—";
  return cur === "KRW" || cur === "JPY"
    ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
    : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();

  const [assets, setAssets]               = useState<Asset[]>([]);
  const [quotes, setQuotes]               = useState<Record<string, Quote>>({});
  const [usdKrw, setUsdKrw]               = useState<number | null>(null); // 1 USD = N KRW
  const [displayCur, setDisplayCur]       = useState<DisplayCurrency>("KRW");
  const [showAdd, setShowAdd]             = useState(false);
  const [editAsset, setEditAsset]         = useState<Asset | null>(null);

  // ── 환율 조회 (USDKRW=X)
  const fetchFxRate = useCallback(async () => {
    const res = await fetch("/api/market/quote?symbols=USDKRW%3DX");
    if (res.ok) {
      const data = await res.json();
      const rate = data["USDKRW=X"]?.price;
      if (rate) setUsdKrw(rate);
    }
  }, []);

  // ── 자산 + 현재가 조회
  const fetchAssets = useCallback(async () => {
    const res = await fetch(`/api/portfolio/${id}/assets-list`);
    if (!res.ok) return;
    const data: Asset[] = await res.json();
    setAssets(data);
    if (data.length === 0) return;
    const symbols = [...new Set(data.map((a) => a.symbol))].join(",");
    const qRes = await fetch(`/api/market/quote?symbols=${symbols}`);
    if (qRes.ok) setQuotes(await qRes.json());
  }, [id]);

  useEffect(() => {
    fetchFxRate();
    fetchAssets();
  }, [fetchFxRate, fetchAssets]);

  // ── 금액 변환: from → displayCur
  function toDisplay(amount: number, fromCur: string): number {
    if (!isFinite(amount)) return NaN;
    if (fromCur === displayCur) return amount;
    if (!usdKrw) return NaN;

    // 먼저 USD로 정규화
    const inUsd =
      fromCur === "USD" ? amount :
      fromCur === "KRW" ? amount / usdKrw :
      NaN;

    if (isNaN(inUsd)) return NaN;
    return displayCur === "USD" ? inUsd : inUsd * usdKrw;
  }

  const sym = CUR_SYM[displayCur] ?? displayCur;

  // ── 합계 계산
  let totalValue = 0, totalCost = 0, hasAllPrices = true;
  for (const asset of assets) {
    const q = quotes[asset.symbol];
    const price = q ? toDisplay(q.price, q.currency) : NaN;
    const cost  = toDisplay(asset.avgCost, asset.currency);
    if (!isFinite(price) || !isFinite(cost)) { hasAllPrices = false; continue; }
    totalValue += price * asset.shares;
    totalCost  += cost  * asset.shares;
  }
  const totalRet = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("portfolio.assets")}</h1>
        <div className="flex items-center gap-3">
          {/* 통화 토글 */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(["KRW", "USD"] as DisplayCurrency[]).map((c) => (
              <button
                key={c}
                onClick={() => setDisplayCur(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  displayCur === c
                    ? "bg-white shadow text-indigo-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {c === "KRW" ? "₩ KRW" : "$ USD"}
              </button>
            ))}
          </div>
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
      </div>

      {/* 환율 배지 */}
      {usdKrw && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-400">
            1 USD = ₩{usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
          </span>
          {!hasAllPrices && (
            <span className="text-xs text-amber-500">일부 종목 환율 변환 중…</span>
          )}
        </div>
      )}

      {/* 요약 바 */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "총 평가금액", value: `${sym}${fmtNum(totalValue, displayCur)}` },
            { label: "총 손익",
              value: `${totalValue - totalCost >= 0 ? "+" : ""}${sym}${fmtNum(Math.abs(totalValue - totalCost), displayCur)}`,
              positive: totalValue >= totalCost },
            { label: "수익률",
              value: totalRet !== null ? `${totalRet >= 0 ? "+" : ""}${totalRet.toFixed(2)}%` : "—",
              positive: (totalRet ?? 0) >= 0 },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${
                s.positive === undefined ? "text-slate-900"
                : s.positive ? "text-emerald-600" : "text-red-500"
              }`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 자산 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/50">
            <tr className="text-xs text-slate-400 uppercase tracking-wide">
              <th className="text-left px-6 py-4">{t("asset.symbol")}</th>
              <th className="text-right px-6 py-4">{t("asset.shares")}</th>
              <th className="text-right px-6 py-4">{t("asset.avgCost")} <span className="normal-case font-normal">({displayCur})</span></th>
              <th className="text-right px-6 py-4">{t("asset.currentPrice")} <span className="normal-case font-normal">({displayCur})</span></th>
              <th className="text-right px-6 py-4">{t("portfolio.value")}</th>
              <th className="text-right px-6 py-4">{t("portfolio.return")}</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {assets.map((asset) => {
              const q = quotes[asset.symbol];
              const rawPrice = q?.price ?? null;
              const quoteCur = q?.currency ?? "USD";

              // 모든 값을 displayCur로 환산
              const dispPrice   = rawPrice !== null ? toDisplay(rawPrice, quoteCur)         : null;
              const dispAvgCost = toDisplay(asset.avgCost, asset.currency);
              const dispValue   = dispPrice !== null ? dispPrice * asset.shares             : null;

              // 수익률: 동일 통화로 계산
              const ret =
                dispPrice !== null &&
                isFinite(dispPrice) &&
                isFinite(dispAvgCost) &&
                dispAvgCost > 0
                  ? ((dispPrice - dispAvgCost) / dispAvgCost) * 100
                  : null;

              const loading = rawPrice === null;
              const converting = rawPrice !== null && (dispPrice === null || isNaN(dispPrice ?? NaN));

              return (
                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{asset.symbol}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[160px]">{asset.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700">{asset.shares}</td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {isFinite(dispAvgCost)
                      ? `${sym}${fmtNum(dispAvgCost, displayCur)}`
                      : <span className="text-slate-300 text-xs">변환 중</span>}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700 font-medium">
                    {loading ? (
                      <span className="text-slate-300 text-xs">조회 중</span>
                    ) : converting ? (
                      <span className="text-slate-300 text-xs">변환 중</span>
                    ) : (
                      `${sym}${fmtNum(dispPrice!, displayCur)}`
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {dispValue !== null && isFinite(dispValue)
                      ? `${sym}${fmtNum(dispValue, displayCur)}`
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold ${
                    ret === null ? "text-slate-300"
                    : ret >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {ret === null
                      ? <span className="text-xs">—</span>
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
        <AddAssetModal portfolioId={id} onSuccess={fetchAssets} onClose={() => setShowAdd(false)} />
      )}
      {editAsset && (
        <EditAssetModal portfolioId={id} asset={editAsset} onSuccess={fetchAssets} onClose={() => setEditAsset(null)} />
      )}
    </div>
  );
}
