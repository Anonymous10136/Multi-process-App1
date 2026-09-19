"use client";

import Link from "next/link";
import { Shell, BottomNav } from "@/components/Shell";
import { Card, PageHeader } from "@/components/ui";
import { triggerPWAInstallModal } from "@/components/PWAInstall";

export default function MorePage() {
  const items = [
    { href: "/equipment", emoji: "🔧", label: "Equipment", desc: "Track, assign, maintain" },
    { href: "/events", emoji: "📅", label: "Events", desc: "Manage all events" },
    { href: "/reports", emoji: "📊", label: "Reports", desc: "Insights & profit" },
    { href: "/backup", emoji: "💾", label: "Backup & Restore", desc: "Protect your data" },
    { href: "/settings", emoji: "⚙️", label: "Settings", desc: "Theme, alerts, preferences" },
    { href: "/about", emoji: "ℹ️", label: "About", desc: "App info" },
  ];
  return (
    <Shell>
      <PageHeader title="More" />
      <div className="space-y-2 p-4">
        <Card
          onClick={triggerPWAInstallModal}
          className="flex items-center gap-4 border-indigo-300 bg-gradient-to-r from-indigo-50 to-violet-50 dark:border-indigo-800 dark:from-indigo-950/50 dark:to-violet-950/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow">
            📲
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-indigo-950 dark:text-indigo-100">Install App on Mobile</div>
            <div className="text-xs text-indigo-700 dark:text-indigo-300">Add to home screen for 100% offline use</div>
          </div>
          <span className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Install</span>
        </Card>
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <Card className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-2xl dark:from-indigo-900/50 dark:to-violet-900/50">
                {it.emoji}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{it.label}</div>
                <div className="text-xs text-slate-500">{it.desc}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Card>
          </Link>
        ))}
      </div>
      <BottomNav />
    </Shell>
  );
}
