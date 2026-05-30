"use client";

import { useState, useEffect, use, useRef } from "react";
import { useTranslations } from "next-intl";

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

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  currency: string;
}

export default function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [showForm, setShowForm] = useState(false);

  // Step 1: search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Step 2: fill details
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [form, setForm] = useState({ shares: "", avgCost: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchAssets() {
    const res = await fetch(`/api/portfolio/${id}/assets-list`);
    if (!res.ok) return;
    const data: Asset[] = await res.json();
    setAssets(data);
    if (data.length > 0) {
      const symbols = [...new Set(data.map((a) => a.symbol))].join(",");
      const qRes = await fetch(`/api/market/quote?symbols=${symbols}`);
      if (qRes.ok) setQuotes(await qRes.json());
    }
  }

  useEffect(() => { fetchAssets(); }, [id]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    if (searchRef.current) clearTimeout(searchRef.current);
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setSearchResults(await res.json());
      setSearching(false);
    }, 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchQuery]);

  async function fetchPriceForSymbol(symbol: string, currency: string): Promise<number | null> {
    setFetchingPrice(true);
    try {
      const res = await fetch(`/api/market/quote?symbols=${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data[symbol]?.price ?? null;
    } finally {
      setFetchingPrice(false);
    }
  }

  async function handleSelectResult(result: SearchResult) {
    setSelected(result);
    setSearchResults([]);
    const price = await fetchPriceForSymbol(result.symbol, result.currency);
    setCurrentPrice(price);
    if (price) setForm((f) => ({ ...f, avgCost: price.toFixed(price >= 100 ? 2 : 4) }));
  }

  async function handleDirectInput() {
    const symbol = searchQuery.trim().toUpperCase();
    if (!symbol) return;
    setFetchingPrice(true);
    const res = await fetch(`/api/market/quote?symbols=${encodeURIComponent(symbol)}`);
    setFetchingPrice(false);
    if (res.ok) {
      const data = await res.json();
      const q = data[symbol];
      if (q) {
        const result: SearchResult = {
          symbol,
          name: q.name ?? symbol,
          exchange: q.exchange ?? "",
          assetType: "STOCK",
          currency: q.currency ?? "USD",
        };
        setSelected(result);
        setCurrentPrice(q.price);
        if (q.price) setForm((f) => ({ ...f, avgCost: q.price.toFixed(q.price >= 100 ? 2 : 4) }));
        return;
      }
    }
    // 못 찾아도 진행 허용
    setSelected({ symbol, name: symbol, exchange: "", assetType: "STOCK", currency: "USD" });
    setCurrentPrice(null);
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setSubmitError("");

    const res = await fetch(`/api/portfolio/${id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: selected.symbol,
        name: selected.name,
        assetType: selected.assetType,
        exchange: selected.exchange,
        currency: selected.currency,
        shares: Number(form.shares),
        avgCost: Number(form.avgCost),
      }),
    });

    if (res.ok) {
      closeModal();
      await fetchAssets();
    } else {
      const err = await res.json().catch(() => ({}));
      setSubmitError(err?.error ?? "추가에 실패했습니다.");
    }
    setSubmitting(false);
  }

  function closeModal() {
    setShowForm(false);
    setSelected(null);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentPrice(null);
    setForm({ shares: "", avgCost: "" });
    setSubmitError("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("portfolio.assets")}</h1>
        <button
          onClick={() => setShowForm(true)}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {assets.map((asset) => {
              const q = quotes[asset.symbol];
              const currentPriceVal = q?.price ?? asset.avgCost;
              const value = currentPriceVal * asset.shares;
              const ret = ((currentPriceVal - asset.avgCost) / asset.avgCost) * 100;
              const currency = q?.currency ?? asset.currency ?? "USD";
              const fmt = (n: number) =>
                n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

              return (
                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{asset.symbol}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[160px]">{asset.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700">{asset.shares}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{currency === "KRW" ? "₩" : "$"}{fmt(asset.avgCost)}</td>
                  <td className="px-6 py-4 text-right text-slate-700 font-medium">
                    {q ? (
                      <span>{currency === "KRW" ? "₩" : "$"}{fmt(currentPriceVal)}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">조회 중</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {currency === "KRW" ? "₩" : "$"}{value.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold ${ret >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <p className="text-slate-400 text-sm">아직 자산이 없습니다.</p>
                  <p className="text-slate-300 text-xs mt-1">위 버튼을 눌러 종목을 추가해보세요.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {selected ? "수량 · 매입가 입력" : "종목 검색"}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step 1: Search */}
            {!selected && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDirectInput()}
                    placeholder="AAPL, 삼성전자, BTC-USD …"
                    autoFocus
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {searching && (
                    <div className="absolute right-3 top-3.5">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    {searchResults.map((r) => (
                      <button
                        key={r.symbol}
                        onClick={() => handleSelectResult(r)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{r.symbol}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[200px]">{r.name}</div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-xs text-slate-400">{r.exchange}</div>
                          <div className="text-xs text-indigo-500 font-medium">{r.assetType}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Direct input fallback */}
                {searchQuery.length >= 1 && searchResults.length === 0 && !searching && (
                  <button
                    onClick={handleDirectInput}
                    disabled={fetchingPrice}
                    className="w-full border border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {fetchingPrice ? (
                      <><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> 조회 중…</>
                    ) : (
                      <>&ldquo;{searchQuery.toUpperCase()}&rdquo; 직접 입력</>
                    )}
                  </button>
                )}

                <p className="text-xs text-slate-400 text-center">검색 후 선택하거나 Enter로 직접 입력</p>

                <button
                  onClick={closeModal}
                  className="w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}

            {/* Step 2: Fill in details */}
            {selected && (
              <form onSubmit={handleAddAsset} className="space-y-4">
                {/* Selected ticker card */}
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{selected.symbol}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[220px]">{selected.name}</div>
                  </div>
                  <button type="button" onClick={() => { setSelected(null); setCurrentPrice(null); }} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
                </div>

                {/* Current price badge */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">현재가</span>
                  {fetchingPrice ? (
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : currentPrice !== null ? (
                    <span className="font-semibold text-indigo-600">
                      {selected.currency === "KRW" ? "₩" : "$"}
                      {currentPrice.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">조회 실패 — 직접 입력해주세요</span>
                  )}
                </div>

                {/* Shares */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("asset.shares")} <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={form.shares}
                    onChange={(e) => setForm({ ...form, shares: e.target.value })}
                    placeholder="0.00"
                    required
                    min="0.000001"
                    step="any"
                    autoFocus
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Avg Cost */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t("asset.avgCost")} <span className="text-red-400">*</span>
                    <span className="ml-1 text-xs font-normal text-slate-400">({selected.currency})</span>
                  </label>
                  <input
                    type="number"
                    value={form.avgCost}
                    onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                    placeholder="0.00"
                    required
                    min="0.000001"
                    step="any"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {currentPrice !== null && form.avgCost && (
                    <p className="text-xs text-slate-400 mt-1">
                      현재가 대비{" "}
                      <span className={Number(form.avgCost) <= currentPrice ? "text-emerald-500" : "text-red-500"}>
                        {(((currentPrice - Number(form.avgCost)) / Number(form.avgCost)) * 100).toFixed(2)}%
                      </span>
                    </p>
                  )}
                </div>

                {submitError && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.shares || !form.avgCost}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "추가 중…" : t("common.add")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
