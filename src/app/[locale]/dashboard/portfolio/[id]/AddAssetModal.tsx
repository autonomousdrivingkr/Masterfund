"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  currency: string;
}

interface ExcelRow {
  _id: string;
  symbol: string;
  name: string;
  shares: string;
  avgCost: string;
  currency: string;
}

const CURRENCIES = ["USD", "KRW", "JPY", "EUR", "HKD", "GBP"];

function CurrencyTag({ c }: { c: string }) {
  return <span className="text-slate-400">{c === "KRW" ? "₩" : c === "JPY" ? "¥" : c === "EUR" ? "€" : c === "GBP" ? "£" : "$"}</span>;
}

interface Props {
  portfolioId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AddAssetModal({ portfolioId, onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<"manual" | "excel">("manual");

  /* ── Manual tab state ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [form, setForm] = useState({ shares: "", avgCost: "", currency: "USD" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Excel tab state ── */
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkDone, setBulkDone] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Search debounce */
  useEffect(() => {
    if (searchQuery.length < 1) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setSearchResults(await res.json());
      setSearching(false);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  async function fetchPrice(symbol: string) {
    setFetchingPrice(true);
    try {
      const res = await fetch(`/api/market/quote?symbols=${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      return (await res.json())[symbol]?.price ?? null;
    } finally { setFetchingPrice(false); }
  }

  async function handleSelectResult(r: SearchResult) {
    setSelected(r);
    setForm((f) => ({ ...f, currency: r.currency }));
    setSearchResults([]);
    const price = await fetchPrice(r.symbol);
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
      const q = (await res.json())[symbol];
      if (q) {
        setSelected({ symbol, name: q.name ?? symbol, exchange: q.exchange ?? "", assetType: "STOCK", currency: q.currency ?? "USD" });
        setForm((f) => ({ ...f, currency: q.currency ?? "USD", avgCost: q.price ? q.price.toFixed(q.price >= 100 ? 2 : 4) : "" }));
        setCurrentPrice(q.price ?? null);
        return;
      }
    }
    setSelected({ symbol, name: symbol, exchange: "", assetType: "STOCK", currency: "USD" });
    setCurrentPrice(null);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch(`/api/portfolio/${portfolioId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: selected.symbol,
        name: selected.name,
        assetType: selected.assetType,
        exchange: selected.exchange || "",
        currency: form.currency,
        shares: Number(form.shares),
        avgCost: Number(form.avgCost),
      }),
    });
    if (res.ok) { onSuccess(); onClose(); }
    else { const e = await res.json().catch(() => ({})); setSubmitError(e?.error ?? "추가 실패"); }
    setSubmitting(false);
  }

  /* ── Excel helpers ── */
  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: "" });
      setRows(
        raw
          .map((row, i) => ({
            _id: `r${i}`,
            symbol: String(row.symbol ?? row.Symbol ?? row["티커"] ?? row["종목코드"] ?? "").toUpperCase().trim(),
            name: String(row.name ?? row.Name ?? row["종목명"] ?? "").trim(),
            shares: String(row.shares ?? row.Shares ?? row["수량"] ?? ""),
            avgCost: String(row.avgCost ?? row["평균매입가"] ?? row["매입가"] ?? ""),
            currency: String(row.currency ?? row.Currency ?? row["통화"] ?? "USD").toUpperCase().trim(),
          }))
          .filter((r) => r.symbol)
      );
      setBulkDone(null);
      setBulkError("");
    };
    reader.readAsBinaryString(file);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function updateRow(id: string, field: keyof ExcelRow, value: string) {
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, [field]: value } : r));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r._id !== id));
  }

  async function handleBulkSubmit() {
    setBulkSubmitting(true);
    setBulkError("");
    const assets = rows
      .filter((r) => r.symbol && Number(r.shares) > 0 && Number(r.avgCost) > 0)
      .map((r) => ({
        symbol: r.symbol,
        name: r.name || r.symbol,
        assetType: "STOCK" as const,
        exchange: "",
        currency: r.currency || "USD",
        shares: Number(r.shares),
        avgCost: Number(r.avgCost),
      }));

    if (!assets.length) { setBulkError("유효한 행이 없습니다."); setBulkSubmitting(false); return; }

    const res = await fetch(`/api/portfolio/${portfolioId}/assets/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets }),
    });

    if (res.ok) {
      const { created } = await res.json();
      setBulkDone(created);
      onSuccess();
    } else {
      setBulkError("일괄 추가에 실패했습니다.");
    }
    setBulkSubmitting(false);
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["symbol", "name", "shares", "avgCost", "currency"],
      ["AAPL", "Apple Inc.", 10, 150.0, "USD"],
      ["005930.KS", "삼성전자", 100, 72000, "KRW"],
      ["BTC-USD", "Bitcoin", 0.5, 45000, "USD"],
    ]);
    ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
    XLSX.writeFile(wb, "masterfund-template.xlsx");
  }

  const priceFmt = (n: number, cur: string) =>
    (cur === "KRW" || cur === "JPY")
      ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : n.toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(["manual", "excel"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t === "manual" ? "직접 입력" : "엑셀 가져오기"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-8 pb-8 flex-1">
          {/* ── MANUAL TAB ── */}
          {tab === "manual" && (
            <div className="space-y-4">
              {!selected ? (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDirectInput()}
                      placeholder="AAPL, 삼성전자, BTC-USD …"
                      autoFocus
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {searching && <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      {searchResults.map((r) => (
                        <button key={r.symbol} onClick={() => handleSelectResult(r)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{r.symbol}</div>
                            <div className="text-xs text-slate-400 truncate max-w-[240px]">{r.name}</div>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            <div className="text-xs text-slate-400">{r.exchange}</div>
                            <div className="text-xs text-indigo-500 font-medium">{r.assetType}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 1 && !searching && searchResults.length === 0 && (
                    <button onClick={handleDirectInput} disabled={fetchingPrice}
                      className="w-full border border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                      {fetchingPrice
                        ? <><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />조회 중…</>
                        : <>"{searchQuery.toUpperCase()}" 직접 입력</>}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 text-center">검색 후 선택하거나 Enter로 직접 입력</p>
                  <button onClick={onClose} className="w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">취소</button>
                </>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  {/* Ticker card */}
                  <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{selected.symbol}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[260px]">{selected.name}</div>
                    </div>
                    <button type="button" onClick={() => { setSelected(null); setCurrentPrice(null); }}
                      className="text-slate-400 hover:text-slate-600 w-6 h-6 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Current price */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 text-xs">현재가 (Yahoo Finance)</span>
                    {fetchingPrice
                      ? <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      : currentPrice !== null
                        ? <span className="font-semibold text-indigo-600 text-sm">{selected.currency === "KRW" ? "₩" : "$"}{priceFmt(currentPrice, selected.currency)}</span>
                        : <span className="text-xs text-slate-400">조회 실패</span>}
                  </div>

                  {/* Shares */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">수량 <span className="text-red-400">*</span></label>
                    <input type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })}
                      placeholder="0.00" required min="0.000001" step="any" autoFocus
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  {/* Currency + AvgCost */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">평균 매입가 <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                      <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value, avgCost: "" })}
                        className="border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                          <CurrencyTag c={form.currency} />
                        </span>
                        <input type="number" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                          placeholder="0.00" required min="0.000001" step="any"
                          className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    {/* Return preview */}
                    {currentPrice !== null && form.avgCost && form.currency === selected.currency && (
                      <p className="text-xs text-slate-400 mt-1.5">
                        현재가 대비{" "}
                        <span className={Number(form.avgCost) <= currentPrice ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                          {(((currentPrice - Number(form.avgCost)) / Number(form.avgCost)) * 100).toFixed(2)}%
                        </span>
                      </p>
                    )}
                  </div>

                  {submitError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50">취소</button>
                    <button type="submit" disabled={submitting || !form.shares || !form.avgCost}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                      {submitting ? "추가 중…" : "추가"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── EXCEL TAB ── */}
          {tab === "excel" && (
            <div className="space-y-4">
              {/* Drop zone */}
              {rows.length === 0 && !bulkDone && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">클릭하거나 파일을 드래그하세요</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx / .xls / .csv 지원</p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {/* Template download */}
              {rows.length === 0 && !bulkDone && (
                <button onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  엑셀 양식 다운로드
                </button>
              )}

              {/* Success banner */}
              {bulkDone !== null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-emerald-700 font-medium">{bulkDone}개 종목이 추가되었습니다.</span>
                  <button onClick={() => { setRows([]); setBulkDone(null); }} className="text-xs text-emerald-600 hover:underline">다시 업로드</button>
                </div>
              )}

              {/* Preview table */}
              {rows.length > 0 && bulkDone === null && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{rows.length}개 종목 미리보기</span>
                    <button onClick={() => { setRows([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-xs text-slate-400 hover:text-slate-600">파일 다시 선택</button>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_80px_100px_72px_32px] gap-2 px-3 py-2 bg-slate-50 text-xs text-slate-400 font-medium">
                      <span>티커</span><span className="text-right">수량</span><span className="text-right">평균매입가</span><span>통화</span><span />
                    </div>
                    <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                      {rows.map((row) => (
                        <div key={row._id} className="grid grid-cols-[1fr_80px_100px_72px_32px] gap-2 px-3 py-2 items-center">
                          <input value={row.symbol} onChange={(e) => updateRow(row._id, "symbol", e.target.value.toUpperCase())}
                            className="text-xs font-semibold text-slate-900 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none py-0.5 bg-transparent" />
                          <input type="number" value={row.shares} onChange={(e) => updateRow(row._id, "shares", e.target.value)}
                            className="text-xs text-right text-slate-700 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none py-0.5 bg-transparent" />
                          <input type="number" value={row.avgCost} onChange={(e) => updateRow(row._id, "avgCost", e.target.value)}
                            className="text-xs text-right text-slate-700 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none py-0.5 bg-transparent" />
                          <select value={row.currency} onChange={(e) => updateRow(row._id, "currency", e.target.value)}
                            className="text-xs text-slate-600 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none py-0.5 bg-transparent">
                            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                          <button onClick={() => removeRow(row._id)} className="text-slate-300 hover:text-red-400 transition-colors flex justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bulkError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{bulkError}</p>}

                  <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50">취소</button>
                    <button onClick={handleBulkSubmit} disabled={bulkSubmitting}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                      {bulkSubmitting ? "추가 중…" : `${rows.length}개 종목 추가`}
                    </button>
                  </div>
                </>
              )}

              {bulkDone !== null && (
                <button onClick={onClose} className="w-full border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50">닫기</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
