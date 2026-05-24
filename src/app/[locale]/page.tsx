import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="px-8 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">{t("common.appName")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-slate-400 hover:text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/signup"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {t("nav.signup")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-8 pt-28 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-4 py-1.5 text-sm text-indigo-300 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
            전 세계 70,000+ 종목 지원
          </div>

          <h1 className="text-6xl font-bold leading-[1.1] tracking-tight text-white">
            {t("home.hero")}
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              {t("home.hero2")}
            </span>
          </h1>
          <p className="mt-7 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t("home.subtitle")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25"
            >
              {t("home.cta")} →
            </Link>
            <Link
              href="/login"
              className="text-slate-400 hover:text-white px-8 py-3.5 rounded-xl text-base font-medium border border-slate-800 hover:border-slate-600 transition-colors"
            >
              {t("nav.login")}
            </Link>
          </div>
        </div>

        {/* Preview Card */}
        <div className="mt-20 max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
            <span className="ml-3 text-xs text-slate-500">대시보드 미리보기</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "총 자산", value: "$248,320", change: "+12.4%" },
              { label: "총 수익률", value: "+24.8%", change: "이번 달" },
              { label: "배당 수익", value: "$1,840", change: "연간" },
            ].map((card) => (
              <div key={card.label} className="bg-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className="text-lg font-bold text-white">{card.value}</p>
                <p className="text-xs text-emerald-400 mt-0.5">{card.change}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">보유 자산</span>
              <span className="text-xs text-slate-500">수익률</span>
            </div>
            {[
              { symbol: "AAPL", name: "Apple Inc.", value: "$54,200", ret: "+18.2%" },
              { symbol: "QQQ", name: "Invesco QQQ ETF", value: "$38,900", ret: "+31.5%" },
              { symbol: "005930", name: "삼성전자", value: "$22,100", ret: "-4.1%" },
            ].map((row) => (
              <div key={row.symbol} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {row.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{row.symbol}</p>
                    <p className="text-xs text-slate-500">{row.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-white">{row.value}</p>
                  <p className={`text-xs ${row.ret.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>{row.ret}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">필요한 모든 것이 한 곳에</h2>
          <p className="mt-3 text-slate-400">복잡한 자산 관리를 단순하게</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: t("home.feature1Title"),
              desc: t("home.feature1Desc"),
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              ),
              color: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20",
              iconBg: "bg-indigo-500/20 text-indigo-400",
            },
            {
              title: t("home.feature2Title"),
              desc: t("home.feature2Desc"),
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
              color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
              iconBg: "bg-emerald-500/20 text-emerald-400",
            },
            {
              title: t("home.feature3Title"),
              desc: t("home.feature3Desc"),
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: "from-violet-500/20 to-violet-500/5 border-violet-500/20",
              iconBg: "bg-violet-500/20 text-violet-400",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`bg-gradient-to-b ${f.color} border rounded-2xl p-7`}
            >
              <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-5`}>
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        © 2026 Masterfund. All rights reserved.
      </footer>
    </div>
  );
}
