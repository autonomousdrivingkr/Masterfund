"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import Sidebar from "./Sidebar";

function ShellInner({ children }: { children: ReactNode }) {
  const { isMobileOpen, openMobile, closeMobile } = useSidebar();
  const appName = useTranslations("common")("appName");

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={closeMobile}
        />
      )}

      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top header — always visible */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={openMobile}
              aria-label="메뉴 열기"
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Logo — mobile only (desktop shows it in sidebar) */}
            <div className="md:hidden flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span className="text-sm font-bold text-slate-100 tracking-tight">{appName}</span>
            </div>
          </div>

          {/* Right actions placeholder */}
          <div className="flex items-center gap-2" />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarProvider>
  );
}
