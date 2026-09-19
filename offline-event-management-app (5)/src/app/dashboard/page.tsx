"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { NotificationBell } from "@/components/NotificationBell";
import { triggerPWAInstallModal } from "@/components/PWAInstall";
import { Badge, Button, Card, PageHeader, Stat } from "@/components/ui";
import { formatPHP, formatPHPShort } from "@/lib/currency";
import { computePackageCost } from "@/lib/costing";
import { addDays, differenceInDays, format, isSameDay, isWithinInterval, startOfDay, startOfWeek, endOfWeek } from "date-fns";

export default function DashboardPage() {
  const items = useLiveQuery(() => db.inventoryItems.toArray(), []) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];
  const events = useLiveQuery(() => db.events.toArray(), []) || [];
  const services = useLiveQuery(() => db.services.toArray(), []) || [];
  const [financials, setFinancials] = useState({
    upcomingRevenue: 0,
    upcomingCost: 0,
    actualRevenue: 0,
    actualCost: 0,
  });

  // Compute financials from upcoming (non-completed/non-cancelled) events + completed events
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const evs = await db.events.toArray();
      const upcoming = evs.filter(
        (e) => e.status !== "completed" && e.status !== "cancelled"
      );
      const completed = evs.filter((e) => e.status === "completed");

      let upcomingRevenue = 0;
      let upcomingCost = 0;
      for (const ev of upcoming) {
        const es = await db.eventServices.where("eventId").equals(ev.id!).toArray();
        upcomingRevenue += ev.revenue || 0;
        for (const svc of es) {
          if (svc.packageId) {
            const sum = await computePackageCost(svc.packageId, svc.multiplier);
            if (sum) upcomingCost += sum.totalEstimatedCost;
          }
        }
      }

      let actualRevenue = 0;
      let actualCost = 0;
      for (const ev of completed) {
        actualRevenue += ev.actualRevenue ?? ev.revenue ?? 0;
        const reqs = await db.eventRequirements.where("eventId").equals(ev.id!).toArray();
        const mats = reqs.reduce(
          (s, r) => s + (r.actualQty ?? 0) * r.historicalCostPerUnit,
          0
        );
        const exps = await db.eventExpenses.where("eventId").equals(ev.id!).toArray();
        const expSum = exps.filter((x) => !x.isEstimated).reduce((s, x) => s + x.amount, 0);
        actualCost += mats + expSum;
      }

      if (!cancelled) {
        setFinancials({
          upcomingRevenue,
          upcomingCost,
          actualRevenue,
          actualCost,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [events.length]);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const todayEvents = events.filter((e) => isSameDay(new Date(e.date), today));
  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= today && e.status !== "completed" && e.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date));
  const weekEvents = events.filter((e) =>
    isWithinInterval(new Date(e.date), { start: weekStart, end: weekEnd })
  );
  const nextEvent = upcomingEvents[0];

  const expWarnDays = 7;
  const expiringItems = items.filter((i) => {
    if (!i.expirationDate) return false;
    const days = differenceInDays(new Date(i.expirationDate), today);
    return days >= 0 && days <= expWarnDays;
  });
  const expiredItems = items.filter(
    (i) => i.expirationDate && differenceInDays(new Date(i.expirationDate), today) < 0
  );
  const lowStockItems = items.filter((i) => i.quantity > 0 && i.quantity <= i.minimumStock);
  const outOfStockItems = items.filter((i) => i.quantity <= 0);

  const equipAvailable = equipment.filter((e) => e.status === "available").length;
  const equipAssigned = equipment.filter((e) => e.status === "assigned" || e.status === "in_use").length;
  const equipMaint = equipment.filter((e) => ["needs_maintenance", "damaged", "under_repair"].includes(e.status)).length;
  const equipMissing = equipment.filter((e) => e.status === "missing").length;

  const byService = (key: string) => items.filter((i) => i.serviceKey === key).length;

  return (
    <Shell>
      <div className="app-bg min-h-screen">
        <PageHeader
          title="Dashboard"
          subtitle={format(today, "EEEE, MMMM d, yyyy")}
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={triggerPWAInstallModal}
                title="Install on mobile device"
              >
                📲 Install
              </Button>
              <NotificationBell />
              <Link href="/settings">
                <Button variant="ghost" size="sm" aria-label="Settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </Button>
              </Link>
            </div>
          }
        />

        <div className="space-y-6 p-4">
          {/* Quick actions */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              <QuickAction href="/inventory?action=add" emoji="📦" label="Add Inventory" />
              <QuickAction href="/packages?action=add" emoji="🎁" label="Add Package" />
              <QuickAction href="/events?action=add" emoji="📅" label="Add Event" />
              <QuickAction href="/equipment?action=add" emoji="🔧" label="Equipment" />
              <QuickAction href="/events" emoji="✅" label="Record Usage" />
              <QuickAction href="/calendar" emoji="🗓️" label="Calendar" />
            </div>
          </section>

          {/* Inventory summary */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Inventory</h2>
              <Link href="/inventory" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total items" value={String(items.length)} tone="info" />
              <Stat
                label="Low stock"
                value={String(lowStockItems.length)}
                tone={lowStockItems.length > 0 ? "warning" : "default"}
              />
              <Stat label="🧀 Grazing" value={String(byService("grazing"))} />
              <Stat label="📸 Photobooth" value={String(byService("photobooth"))} />
              <Stat label="🍷 Wine Bar" value={String(byService("wine"))} />
              <Stat
                label="Out of stock"
                value={String(outOfStockItems.length)}
                tone={outOfStockItems.length > 0 ? "danger" : "default"}
              />
            </div>
          </section>

          {/* Equipment */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Equipment</h2>
              <Link href="/equipment" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Available" value={String(equipAvailable)} tone="positive" />
              <Stat label="Assigned" value={String(equipAssigned)} tone="info" />
              <Stat label="Maintenance" value={String(equipMaint)} tone="warning" />
              <Stat label="Missing" value={String(equipMissing)} tone="danger" />
            </div>
          </section>

          {/* Events */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Events</h2>
              <Link href="/events" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Today" value={String(todayEvents.length)} tone="info" />
              <Stat label="This week" value={String(weekEvents.length)} />
              <Stat label="Upcoming" value={String(upcomingEvents.length)} tone="info" />
              <Stat
                label="Next event"
                value={nextEvent ? format(new Date(nextEvent.date), "MMM d") : "—"}
                sub={nextEvent?.name}
                tone="info"
              />
            </div>
          </section>

          {/* Financial */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Financial Summary</h2>
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Upcoming revenue</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatPHPShort(financials.upcomingRevenue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Estimated cost</div>
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                    {formatPHPShort(financials.upcomingCost)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Actual revenue</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPHPShort(financials.actualRevenue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Actual cost</div>
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                    {formatPHPShort(financials.actualCost)}
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wide text-slate-500">Upcoming gross profit</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPHP(financials.upcomingRevenue - financials.upcomingCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wide text-slate-500">Actual gross profit</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPHP(financials.actualRevenue - financials.actualCost)}
                  </span>
                </div>
              </div>
            </Card>
          </section>

          {/* Alerts */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Alerts</h2>
            <AlertList
              items={[
                {
                  kind: "danger",
                  title: `${outOfStockItems.length} out-of-stock items`,
                  detail: outOfStockItems.slice(0, 3).map((i) => i.name).join(", "),
                  show: outOfStockItems.length > 0,
                  href: "/inventory?filter=out",
                },
                {
                  kind: "warning",
                  title: `${lowStockItems.length} low-stock items`,
                  detail: lowStockItems.slice(0, 3).map((i) => i.name).join(", "),
                  show: lowStockItems.length > 0,
                  href: "/inventory?filter=low",
                },
                {
                  kind: "warning",
                  title: `${expiringItems.length} expiring soon`,
                  detail: expiringItems.slice(0, 3).map((i) => i.name).join(", "),
                  show: expiringItems.length > 0,
                  href: "/inventory?filter=expiring",
                },
                {
                  kind: "danger",
                  title: `${expiredItems.length} expired items`,
                  detail: expiredItems.slice(0, 3).map((i) => i.name).join(", "),
                  show: expiredItems.length > 0,
                  href: "/inventory?filter=expired",
                },
                {
                  kind: "info",
                  title: `${equipMaint} equipment needs attention`,
                  detail: "Maintenance, damage, or repairs",
                  show: equipMaint > 0,
                  href: "/equipment",
                },
                {
                  kind: "info",
                  title: `${upcomingEvents.length} upcoming events`,
                  detail: nextEvent ? `Next: ${nextEvent.name}` : undefined,
                  show: upcomingEvents.length > 0,
                  href: "/events",
                },
              ]}
            />
            {outOfStockItems.length === 0 &&
              lowStockItems.length === 0 &&
              expiringItems.length === 0 &&
              expiredItems.length === 0 &&
              equipMaint === 0 && (
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl dark:bg-emerald-900/40">
                      ✓
                    </div>
                    <div>
                      <div className="text-sm font-semibold">All clear!</div>
                      <div className="text-xs text-slate-500">No urgent alerts at the moment.</div>
                    </div>
                  </div>
                </Card>
              )}
          </section>

          {/* Services cards */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Services</h2>
            <div className="grid grid-cols-1 gap-3">
              {services.filter((s) => s.key !== "shared").map((s) => (
                <Link key={s.key} href={`/inventory?service=${s.key}`}>
                  <Card className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-2xl dark:from-indigo-900/50 dark:to-violet-900/50">
                      {s.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {byService(s.key)} items · {items.filter((i) => i.serviceKey === s.key && i.quantity <= i.minimumStock).length} low stock
                      </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <BottomNav />
      </div>
    </Shell>
  );
}

function QuickAction({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link href={href}>
      <Card className="flex flex-col items-center justify-center gap-1 py-4 text-center">
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
      </Card>
    </Link>
  );
}

function AlertList({
  items,
}: {
  items: Array<{
    kind: "danger" | "warning" | "info";
    title: string;
    detail?: string;
    show: boolean;
    href: string;
  }>;
}) {
  const visible = items.filter((i) => i.show);
  if (!visible.length) return null;
  return (
    <div className="space-y-2">
      {visible.map((it, idx) => (
        <Link key={idx} href={it.href}>
          <Card className="flex items-start gap-3">
            <div
              className={
                it.kind === "danger"
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                  : it.kind === "warning"
                    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
              }
            >
              {it.kind === "danger" ? "!" : it.kind === "warning" ? "⚠" : "i"}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{it.title}</div>
              {it.detail && <div className="text-xs text-slate-500">{it.detail}</div>}
            </div>
            <Badge tone={it.kind === "danger" ? "red" : it.kind === "warning" ? "amber" : "indigo"}>
              {it.kind}
            </Badge>
          </Card>
        </Link>
      ))}
    </div>
  );
}
