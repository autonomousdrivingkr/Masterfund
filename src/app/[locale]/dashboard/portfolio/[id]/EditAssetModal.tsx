"use client";

import { useState, useEffect } from "react";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currency: string;
}

const CURRENCIES = ["USD", "KRW", "JPY", "EUR", "HKD", "GBP"];

interface Props {
  portfolioId: string;
  asset: Asset;
  onSuccess: () => void;
  onClose: () => void;
}

export default function EditAssetModal({ portfolioId, asset, onSuccess, onClose }: Props) {
  const [form, setForm] = useState({
    shares: String(asset.shares),
    avgCost: String(asset.avgCost),
    currency: asset.currency,
  });
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/market/quote?symbols=${encodeURIComponent(asset.symbol)}`)
      .then((r) => r.json())
      .then((d) => setCurrentPrice(d[asset.symbol]?.price ?? null))
      .catch(() => {});
  }, [asset.symbol]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/portfolio/${portfolioId}/assets/${asset.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shares: Number(form.shares),
        avgCost: Number(form.avgCost),
        currency: form.currency,
      }),
    });
    if (res.ok) { onSuccess(); onClose(); }
    else { const e = await res.json().catch(() => ({})); setError(e?.error ?? "수정 실패"); }
    setSubmitting(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/portfolio/${portfolioId}/assets/${asset.id}`, { method: "DELETE" });
    onSuccess();
    onClose();
  }

  const priceFmt = (n: number, cur: string) =>
    (cur === "KRW" || cur === "JPY")
      ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : n.toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">자산 수정</h2>
            <p className="text-xs text-slate-400 mt-0.5">{asset.symbol} · {asset.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current price reference */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <span className="text-xs text-slate-500">현재가 (Yahoo Finance)</span>
          {currentPrice !== null
            ? <span className="font-semibold text-indigo-600 text-sm">{asset.currency === "KRW" ? "₩" : "$"}{priceFmt(currentPrice, asset.currency)}</span>
            : <span className="text-xs text-slate-400">조회 중…</span>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shares */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">수량 <span className="text-red-400">*</span></label>
            <input type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })}
              required min="0.000001" step="any"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Currency + AvgCost */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">평균 매입가 <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                required min="0.000001" step="any" placeholder="0.00"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {currentPrice !== null && form.avgCost && form.currency === asset.currency && (
              <p className="text-xs text-slate-400 mt-1.5">
                현재가 대비{" "}
                <span className={Number(form.avgCost) <= currentPrice ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                  {(((currentPrice - Number(form.avgCost)) / Number(form.avgCost)) * 100).toFixed(2)}%
                </span>
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50">취소</button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
              {submitting ? "저장 중…" : "저장"}
            </button>
          </div>
        </form>

        {/* Delete section */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full text-sm text-red-400 hover:text-red-600 hover:bg-red-50 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              이 자산 삭제
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-center text-slate-500">정말 삭제하시겠습니까?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-medium hover:bg-slate-50">취소</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
                  {deleting ? "삭제 중…" : "삭제 확인"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
