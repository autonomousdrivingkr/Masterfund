"use client";

import { useState, useEffect, use } from "react";
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
  changePercent: number;
  currency: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [form, setForm] = useState({ shares: "", avgCost: "" });
  const [loading, setLoading] = useState(false);

  async function fetchAssets() {
    const res = await fetch(`/api/portfolio/${id}/assets-list`);
    if (res.ok) {
      const data: Asset[] = await res.json();
      setAssets(data);
      if (data.length > 0) {
        const symbols = [...new Set(data.map((a) => a.symbol))].join(",");
        const qRes = await fetch(`/api/market/quote?symbols=${symbols}`);
        if (qRes.ok) setQuotes(await qRes.json());
      }
    }
  }

  useEffect(() => { fetchAssets(); }, [id]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setSearchResults(await res.json());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);

    await fetch(`/api/portfolio/${id}/assets`, {
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

    setShowForm(false);
    setSelected(null);
    setSearchQuery("");
    setForm({ shares: "", avgCost: "" });
    await fetchAssets();
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("portfolio.assets")}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + {t("asset.title")}
        </button>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-6 py-4">{t("asset.symbol")}</th>
              <th className="text-right px-6 py-4">{t("asset.shares")}</th>
              <th className="text-right px-6 py-4">{t("asset.avgCost")}</th>
              <th className="text-right px-6 py-4">{t("asset.currentPrice")}</th>
              <th className="text-right px-6 py-4">{t("portfolio.value")}</th>
              <th className="text-right px-6 py-4">{t("portfolio.return")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {assets.map((asset) => {
              const q = quotes[asset.symbol];
              const currentPrice = q?.price ?? asset.avgCost;
              const value = currentPrice * asset.shares;
              const cost = asset.avgCost * asset.shares;
              const ret = ((currentPrice - asset.avgCost) / asset.avgCost) * 100;

              return (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{asset.symbol}</div>
                    <div className="text-xs text-gray-400">{asset.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">{asset.shares}</td>
                  <td className="px-6 py-4 text-right text-gray-700">${asset.avgCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-gray-700">${currentPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    ${value.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${ret >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  자산을 추가해보세요
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t("asset.title")}</h2>

            {!selected ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("asset.symbol")}</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("asset.searchPlaceholder")}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                    {searchResults.map((r) => (
                      <button
                        key={r.symbol}
                        onClick={() => setSelected(r)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{r.symbol}</div>
                          <div className="text-xs text-gray-400">{r.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">{r.exchange}</div>
                          <div className="text-xs text-blue-500">{r.assetType}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowForm(false)}
                  className="mt-4 w-full border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddAsset} className="space-y-4">
                <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{selected.symbol}</div>
                    <div className="text-xs text-gray-500">{selected.name}</div>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("asset.shares")}</label>
                  <input
                    type="number"
                    value={form.shares}
                    onChange={(e) => setForm({ ...form, shares: e.target.value })}
                    required
                    min="0.000001"
                    step="any"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("asset.avgCost")}</label>
                  <input
                    type="number"
                    value={form.avgCost}
                    onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                    required
                    min="0.000001"
                    step="any"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? t("common.loading") : t("common.add")}
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
