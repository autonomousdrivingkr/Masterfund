import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { getMultipleQuotes } from "@/lib/market";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage() {
  const t = await getTranslations();
  const session = await auth();

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: session!.user!.id! },
    include: { assets: true },
  });

  const allSymbols = portfolios.flatMap((p) => p.assets.map((a) => a.symbol));
  const quotes = allSymbols.length > 0 ? await getMultipleQuotes([...new Set(allSymbols)]) : {};

  let totalValue = 0;
  let totalCost = 0;

  for (const portfolio of portfolios) {
    for (const asset of portfolio.assets) {
      const quote = quotes[asset.symbol];
      const currentPrice = quote?.price ?? asset.avgCost;
      totalValue += currentPrice * asset.shares;
      totalCost += asset.avgCost * asset.shares;
    }
  }

  const totalProfit = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">포트폴리오 현황을 한눈에 확인하세요</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t("dashboard.totalValue")}
          value={`$${totalValue.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          }
          iconBg="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label={t("dashboard.totalProfit")}
          value={`${totalProfit >= 0 ? "+" : ""}$${Math.abs(totalProfit).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          positive={totalProfit >= 0}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg={totalProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}
        />
        <StatCard
          label={t("dashboard.totalReturn")}
          value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
          positive={totalReturn >= 0}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          iconBg={totalReturn >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}
        />
        <StatCard
          label={t("dashboard.myPortfolios")}
          value={String(portfolios.length)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          iconBg="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Portfolios */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">{t("dashboard.myPortfolios")}</h2>
        <Link
          href="/dashboard/portfolio"
          className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
        >
          {t("dashboard.createPortfolio")} →
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium mb-1">{t("dashboard.noPortfolio")}</p>
          <p className="text-slate-400 text-sm mb-6">첫 포트폴리오를 만들고 자산을 추가해보세요</p>
          <Link
            href="/dashboard/portfolio"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {t("dashboard.createPortfolio")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map((p) => {
            let pValue = 0;
            let pCost = 0;
            for (const asset of p.assets) {
              const q = quotes[asset.symbol];
              pValue += (q?.price ?? asset.avgCost) * asset.shares;
              pCost += asset.avgCost * asset.shares;
            }
            const pProfit = pValue - pCost;
            const pReturn = pCost > 0 ? (pProfit / pCost) * 100 : 0;
            const positive = pReturn >= 0;

            return (
              <Link key={p.id} href={`/dashboard/portfolio/${p.id}` as "/dashboard"}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{p.assets.length}개 종목</p>
                    </div>
                    <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{p.currency}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mb-2">
                    ${pValue.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                      {positive ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      )}
                      {Math.abs(pReturn).toFixed(2)}%
                    </span>
                    <span className={`text-xs ${positive ? "text-emerald-600" : "text-red-500"}`}>
                      {positive ? "+" : "-"}${Math.abs(pProfit).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

function StatCard({
  label,
  value,
  positive,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  positive?: boolean;
  icon: React.ReactNode;
  iconBg: string;
}) {
  const valueColor =
    positive === undefined
      ? "text-slate-900"
      : positive
      ? "text-emerald-600"
      : "text-red-500";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
