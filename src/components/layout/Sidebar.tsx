"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { signOut } from "next-auth/react";
import { useSidebar } from "./SidebarContext";

const navItems = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    ),
  },
  {
    key: "portfolio",
    href: "/dashboard/portfolio",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "assets",
    href: "/dashboard/assets",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    key: "dividends",
    href: "/dashboard/dividends",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const t = useTranslations("nav");
  const appName = useTranslations("common")("appName");
  const pathname = usePathname();
  const { isMobileOpen, isCollapsed, closeMobile, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={[
        "bg-slate-900 border-r border-slate-800 flex flex-col shrink-0",
        "fixed inset-y-0 left-0 z-30 w-72",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:inset-auto md:z-auto md:translate-x-0",
        isCollapsed ? "md:w-16" : "md:w-60",
        "transition-all duration-300 ease-in-out",
      ].join(" ")}
    >
      {/* Logo — height matches top header */}
      <div className="h-16 px-3 flex items-center border-b border-slate-800 shrink-0">
        <div className={`flex items-center w-full ${isCollapsed ? "justify-center" : "justify-between px-1"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            {!isCollapsed && (
              <span className="text-sm font-bold text-slate-100 tracking-tight truncate">{appName}</span>
            )}
          </div>
          {/* Mobile close button */}
          <button
            onClick={closeMobile}
            aria-label="메뉴 닫기"
            className="md:hidden text-slate-500 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isExact = pathname === item.href || pathname.endsWith(item.href);
          const isParent = item.href !== "/dashboard" && pathname.includes(item.href);
          const active = isExact || isParent;

          return (
            <Link
              key={item.key}
              href={item.href as "/dashboard"}
              onClick={closeMobile}
              title={isCollapsed ? t(item.key as "dashboard") : undefined}
              className={[
                "flex items-center py-2.5 rounded-xl text-sm font-medium transition-all",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent",
              ].join(" ")}
            >
              <span className={`shrink-0 ${active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                {item.icon}
              </span>
              {!isCollapsed && <span>{t(item.key as "dashboard")}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-0.5 shrink-0">
        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
          className={[
            "hidden md:flex w-full items-center py-2.5 rounded-xl text-sm font-medium",
            "text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all border border-transparent",
            isCollapsed ? "justify-center px-2" : "gap-3 px-3",
          ].join(" ")}
        >
          <svg
            className={`w-[18px] h-[18px] shrink-0 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!isCollapsed && <span>접기</span>}
        </button>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          title={isCollapsed ? t("logout") : undefined}
          className={[
            "w-full flex items-center py-2.5 rounded-xl text-sm font-medium",
            "text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all border border-transparent",
            isCollapsed ? "justify-center px-2" : "gap-3 px-3",
          ].join(" ")}
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span>{t("logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
