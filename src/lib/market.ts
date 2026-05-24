export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  marketCap?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
  currency: string;
}

// Yahoo Finance v8 API (no key required for basic usage)
const YF_BASE = "https://query1.finance.yahoo.com";

export async function searchAssets(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const quotes = data?.finance?.result?.[0]?.quotes ?? [];

  return quotes
    .filter((q: { quoteType?: string }) => q.quoteType && q.quoteType !== "FUTURE")
    .map((q: { symbol?: string; longname?: string; shortname?: string; exchange?: string; quoteType?: string; currency?: string }) => ({
      symbol: q.symbol ?? "",
      name: q.longname ?? q.shortname ?? q.symbol ?? "",
      exchange: q.exchange ?? "",
      assetType: mapQuoteType(q.quoteType ?? ""),
      currency: q.currency ?? "USD",
    }));
}

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  const res = await fetch(
    `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  return {
    symbol: meta.symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price: meta.regularMarketPrice ?? 0,
    change: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0),
    changePercent:
      (((meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0)) /
        (meta.chartPreviousClose ?? 1)) *
      100,
    currency: meta.currency ?? "USD",
    exchange: meta.exchangeName ?? "",
    dividendYield: meta.trailingAnnualDividendYield,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
  };
}

export async function getMultipleQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
  const results: Record<string, QuoteData> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const quote = await getQuote(symbol);
      if (quote) results[symbol] = quote;
    })
  );
  return results;
}

function mapQuoteType(type: string): string {
  const map: Record<string, string> = {
    EQUITY: "STOCK",
    ETF: "ETF",
    BOND: "BOND",
    MUTUALFUND: "ETF",
    CRYPTOCURRENCY: "CRYPTO",
  };
  return map[type] ?? "OTHER";
}
