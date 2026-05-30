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

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

const YF_BASE = "https://query1.finance.yahoo.com";
const YF_BASE2 = "https://query2.finance.yahoo.com";

async function yfFetch(path: string, revalidate = 300): Promise<Response> {
  const res = await fetch(`${YF_BASE}${path}`, {
    headers: YF_HEADERS,
    next: { revalidate },
  });
  if (!res.ok) {
    // fallback to query2
    return fetch(`${YF_BASE2}${path}`, {
      headers: YF_HEADERS,
      next: { revalidate },
    });
  }
  return res;
}

export async function searchAssets(query: string): Promise<SearchResult[]> {
  try {
    const res = await yfFetch(
      `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`,
      60
    );
    if (!res.ok) return [];

    const data = await res.json();
    // Yahoo Finance v1 search returns { quotes: [...] } directly
    const quotes: Record<string, string>[] = data?.quotes ?? [];

    return quotes
      .filter((q) => q.quoteType && q.quoteType !== "FUTURE" && q.symbol)
      .slice(0, 8)
      .map((q) => ({
        symbol: q.symbol ?? "",
        name: q.longname ?? q.shortname ?? q.symbol ?? "",
        exchange: q.exchange ?? "",
        assetType: mapQuoteType(q.quoteType ?? ""),
        currency: q.currency ?? "USD",
      }));
  } catch {
    return [];
  }
}

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const res = await yfFetch(
      `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      300
    );
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose ?? 0;
    const price = meta.regularMarketPrice ?? 0;

    return {
      symbol: meta.symbol ?? symbol,
      name: meta.longName ?? meta.shortName ?? symbol,
      price,
      change: price - prevClose,
      changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      currency: meta.currency ?? "USD",
      exchange: meta.exchangeName ?? "",
      dividendYield: meta.trailingAnnualDividendYield,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    };
  } catch {
    return null;
  }
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
