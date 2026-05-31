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
type SortKey = "value" | "ret";
type SortDir = "asc" | "desc";

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
  const [usdKrw, setUsdKrw]               = useState<number | null>(null);
  const [displayCur, setDisplayCur]       = useState<DisplayCurrency>("KRW");
  const [showAdd, setShowAdd]             = useState(false);
  const [editAsset, setEditAsset]         = useState<Asset | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [sortKey, setSortKey]             = useState<SortKey>("value");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");

  async function handleDeleteAsset(assetId: string) {
    setDeleting(true);
    await fetch(`/api/portfolio/${id}/assets/${assetId}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    setDeleting(false);
    await fetchAssets();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const fetchFxRate = useCallback(async () => {
    const res = await fetch("/api/market/quote?symbols=USDKRW%3DX");
    if (res.ok) {
      const data = await res.json();
      const rate = data["USDKRW=X"]?.price;
      if (rate) setUsdKrw(rate);
    }
  }, []);

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

  function toDisplay(amount: number, fromCur: string): number {
    if (!isFinite(amount)) return NaN;
    if (fromCur === displayCur) return amount;
    if (!usdKrw) return NaN;
    const inUsd =
      fromCur === "USD" ? amount :
      fromCur === "KRW" ? amount / usdKrw :
      NaN;
    if (isNaN(inUsd)) return NaN;
    return displayCur === "USD" ? inUsd : inUsd * usdKrw;
  }

  const sym = CUR_SYM[displayCur] ?? displayCur;

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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{t("portfolio.assets")}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {/* 통화 토글 */}
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
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{t("asset.title")}</span>
            <span className="sm:hidden">추가</span>
          </button>
        </div>
      </div>

      {/* 환율 배지 */}
      {usdKrw && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">
            1 USD = ₩{usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
          </span>
          {!hasAllPrices && (
            <span className="text-xs text-amber-400">일부 종목 환율 변환 중…</span>
          )}
        </div>
      )}

      {/* 요약 바 — 모바일 3열 핵심 수정: 패딩·폰트 최소화 + truncate */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "평가금액", value: `${sym}${fmtNum(totalValue, displayCur)}` },
            {
              label: "손 익",
              value: `${totalValue - totalCost >= 0 ? "+" : ""}${sym}${fmtNum(Math.abs(totalValue - totalCost), displayCur)}`,
              positive: totalValue >= totalCost,
            },
            {
              label: "수익률",
              value: totalRet !== null ? `${totalRet >= 0 ? "+" : ""}${totalRet.toFixed(2)}%` : "—",
              positive: (totalRet ?? 0) >= 0,
            },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl border border-slate-700/50 px-3 py-3 min-w-0 overflow-hidden">
              <p className="text-[11px] text-slate-500 mb-1 truncate">{s.label}</p>
              <p className={`text-sm sm:text-base font-bold truncate ${
                s.positive === undefined ? "text-slate-100"
                : s.positive ? "text-emerald-400" : "text-red-400"
              }`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 자산 테이블 — overflow-x-auto로 모바일 수평스크롤 */}
      {(() => {
        const rows = assets.map((asset) => {
          const q = quotes[asset.symbol];
          const rawPrice = q?.price ?? null;
          const quoteCur = q?.currency ?? "USD";
          const dispPrice   = rawPrice !== null ? toDisplay(rawPrice, quoteCur) : null;
          const dispAvgCost = toDisplay(asset.avgCost, asset.currency);
          const dispValue   = dispPrice !== null && isFinite(dispPrice) ? dispPrice * asset.shares : null;
          const ret =
            dispPrice !== null && isFinite(dispPrice) && isFinite(dispAvgCost) && dispAvgCost > 0
              ? ((dispPrice - dispAvgCost) / dispAvgCost) * 100
              : null;
          return { asset, dispPrice, dispAvgCost, dispValue, ret,
            loading: rawPrice === null,
            converting: rawPrice !== null && (dispPrice === null || !isFinite(dispPrice ?? NaN)) };
        });

        const sorted = [...rows].sort((a, b) => {
          const av = sortKey === "value" ? (a.dispValue ?? -Infinity) : (a.ret ?? -Infinity);
          const bv = sortKey === "value" ? (b.dispValue ?? -Infinity) : (b.ret ?? -Infinity);
          return sortDir === "desc" ? bv - av : av - bv;
        });

        const SortBtn = ({ col, label }: { col: SortKey; label: string }) => {
          const active = sortKey === col;
          return (
            <button
              onClick={() => handleSort(col)}
              className={`inline-flex items-center gap-1 hover:text-slate-300 transition-colors ${active ? "text-indigo-400" : "text-slate-500"}`}
            >
              {label}
              <span className="flex flex-col leading-none ml-0.5">
                <svg className={`w-2.5 h-2.5 -mb-0.5 ${active && sortDir === "asc" ? "text-indigo-400" : "text-slate-600"}`} fill="currentColor" viewBox="0 0 10 6">
                  <path d="M5 0L10 6H0z" />
                </svg>
                <svg className={`w-2.5 h-2.5 ${active && sortDir === "desc" ? "text-indigo-400" : "text-slate-600"}`} fill="currentColor" viewBox="0 0 10 6">
                  <path d="M5 6L0 0h10z" />
                </svg>
              </span>
            </button>
          );
        };

        return (
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="border-b border-slate-700 bg-slate-900/60">
                  <tr className="text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-4 text-slate-500">{t("asset.symbol")}</th>
                    <th className="text-right px-5 py-4 text-slate-500">{t("asset.shares")}</th>
                    <th className="text-right px-5 py-4 text-slate-500">{t("asset.avgCost")} <span className="normal-case font-normal">({displayCur})</span></th>
                    <th className="text-right px-5 py-4 text-slate-500">{t("asset.currentPrice")} <span className="normal-case font-normal">({displayCur})</span></th>
                    <th className="text-right px-5 py-4">
                      <SortBtn col="value" label={t("portfolio.value")} />
                    </th>
                    <th className="text-right px-5 py-4">
                      <SortBtn col="ret" label={t("portfolio.return")} />
                    </th>
                    <th className="px-4 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {sorted.map(({ asset, dispPrice, dispAvgCost, dispValue, ret, loading, converting }) => (
                    <tr key={asset.id} className="hover:bg-slate-700/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-100">{asset.symbol}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[140px]">{asset.name}</div>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-400">{asset.shares}</td>
                      <td className="px-5 py-4 text-right text-slate-500">
                        {isFinite(dispAvgCost)
                          ? `${sym}${fmtNum(dispAvgCost, displayCur)}`
                          : <span className="text-slate-600 text-xs">변환 중</span>}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-300 font-medium">
                        {loading ? <span className="text-slate-600 text-xs">조회 중</span>
                          : converting ? <span className="text-slate-600 text-xs">변환 중</span>
                          : `${sym}${fmtNum(dispPrice!, displayCur)}`}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-100">
                        {dispValue !== null && isFinite(dispValue)
                          ? `${sym}${fmtNum(dispValue, displayCur)}`
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className={`px-5 py-4 text-right font-semibold ${
                        ret === null ? "text-slate-600" : ret >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {ret === null ? <span className="text-xs">—</span> : `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => setEditAsset(asset)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(asset.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <p className="text-slate-500 text-sm">아직 자산이 없습니다.</p>
                        <p className="text-slate-600 text-xs mt-1">위 버튼을 눌러 종목을 추가해보세요.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 자산 삭제 확인 모달 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-slate-100 text-center mb-2">자산 삭제</h2>
            <p className="text-sm text-slate-400 text-center mb-6">
              {(() => {
                const a = assets.find((x) => x.id === confirmDeleteId);
                return a ? `${a.symbol} (${a.shares}주) 을 삭제합니다.` : "이 자산을 삭제합니다.";
              })()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-slate-700 text-slate-400 py-3 rounded-xl text-sm font-medium hover:bg-slate-700 hover:text-slate-200 transition-colors"
              >취소</button>
              <button
                onClick={() => handleDeleteAsset(confirmDeleteId)} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddAssetModal
          portfolioId={id}
          existingAssets={assets}
          onSuccess={fetchAssets}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editAsset && (
        <EditAssetModal portfolioId={id} asset={editAsset} onSuccess={fetchAssets} onClose={() => setEditAsset(null)} />
      )}
    </div>
  );
}
