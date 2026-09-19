"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Card, PageHeader, Select, Stat, Tabs } from "@/components/ui";
import { formatPHP } from "@/lib/currency";
import { computePackageCost } from "@/lib/costing";
import type { ServiceKey } from "@/lib/types";

export default function ReportsPage() {
  const [tab, setTab] = useState<"overview" | "events" | "inventory" | "profit">("overview");
  const events = useLiveQuery(() => db.events.toArray(), []) || [];
  const items = useLiveQuery(() => db.inventoryItems.toArray(), []) || [];
  const reqs = useLiveQuery(() => db.eventRequirements.toArray(), []) || [];
  const exps = useLiveQuery(() => db.eventExpenses.toArray(), []) || [];
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("90");

  const filteredEvents = useMemo(() => {
    if (range === "all") return events;
    const cutoff = subDays(new Date(), Number(range));
    return events.filter((e) => new Date(e.date) >= cutoff);
  }, [events, range]);

  const completedEvents = filteredEvents.filter((e) => e.status === "completed");
  const totalRevenue = completedEvents.reduce((s, e) => s + (e.actualRevenue ?? e.revenue ?? 0), 0);

  // Actual cost per completed event
  const [costByEvent, setCostByEvent] = useState<Array<{ name: string; revenue: number; cost: number; profit: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Array<{ name: string; revenue: number; cost: number; profit: number }> = [];
      for (const ev of completedEvents) {
        const rs = reqs.filter((r) => r.eventId === ev.id);
        const matCost = rs.reduce((s, r) => s + (r.actualQty ?? r.plannedQty) * r.historicalCostPerUnit, 0);
        const expSum = exps.filter((e) => e.eventId === ev.id && !e.isEstimated).reduce((s, e) => s + e.amount, 0);
        const cost = matCost + expSum;
        const rev = ev.actualRevenue ?? ev.revenue;
        out.push({ name: ev.name.slice(0, 20), revenue: rev, cost, profit: rev - cost });
      }
      if (!cancelled) setCostByEvent(out);
    })();
    return () => { cancelled = true; };
  }, [completedEvents.length, reqs.length, exps.length]);

  const totalCost = costByEvent.reduce((s, c) => s + c.cost, 0);
  const totalProfit = totalRevenue - totalCost;

  const serviceRevenue: Record<ServiceKey, number> = { grazing: 0, photobooth: 0, wine: 0, shared: 0 };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<ServiceKey, number> = { grazing: 0, photobooth: 0, wine: 0, shared: 0 };
      for (const ev of completedEvents) {
        const es = await db.eventServices.where("eventId").equals(ev.id!).toArray();
        // split revenue proportionally across services by their package selling price × multiplier
        let totalWeight = 0;
        const weights: Array<{ key: ServiceKey; w: number }> = [];
        for (const s of es) {
          if (s.packageId) {
            const sum = await computePackageCost(s.packageId, s.multiplier);
            if (sum) {
              totalWeight += sum.sellingPrice;
              weights.push({ key: s.serviceKey, w: sum.sellingPrice });
            }
          }
        }
        if (totalWeight === 0) continue;
        const rev = ev.actualRevenue ?? ev.revenue;
        for (const w of weights) {
          out[w.key] += (rev * w.w) / totalWeight;
        }
      }
      if (!cancelled) setServiceRevenue(out);
    })();
    return () => { cancelled = true; };
  }, [completedEvents.length]);

  const [serviceRevState, setServiceRevenue] = useState<Record<ServiceKey, number>>(serviceRevenue);

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"];
  const pieData = [
    { name: "Grazing", value: serviceRevState.grazing },
    { name: "Photobooth", value: serviceRevState.photobooth },
    { name: "Wine Bar", value: serviceRevState.wine },
  ].filter((d) => d.value > 0);

  const inventoryValue = items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.minimumStock).length;
  const outOfStock = items.filter((i) => i.quantity <= 0).length;

  // Usage summary per item (actual consumed qty)
  const usageByItem = useMemo(() => {
    const m = new Map<number, { qty: number; cost: number }>();
    for (const r of reqs) {
      if (r.actualQty === undefined) continue;
      const ev = events.find((e) => e.id === r.eventId);
      if (!ev || ev.status !== "completed") continue;
      const prev = m.get(r.inventoryItemId) || { qty: 0, cost: 0 };
      prev.qty += r.actualQty;
      prev.cost += r.actualQty * r.historicalCostPerUnit;
      m.set(r.inventoryItemId, prev);
    }
    return Array.from(m.entries())
      .map(([id, v]) => {
        const item = items.find((i) => i.id === id);
        return { id, name: item?.name || "?", ...v, unit: item?.unit || "" };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [reqs, events, items]);

  return (
    <Shell>
      <PageHeader title="Reports" subtitle="Insights & analytics" />
      <div className="space-y-3 p-4">
        <Tabs
          tabs={[
            { key: "overview", label: "Overview" },
            { key: "events", label: "Events" },
            { key: "inventory", label: "Inventory" },
            { key: "profit", label: "Profit" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as typeof tab)}
        />
        <div className="flex items-center justify-end">
          <Select value={range} onChange={(e) => setRange(e.target.value as "30" | "90" | "365" | "all")} className="h-9 w-auto">
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </Select>
        </div>

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Revenue" value={formatPHP(totalRevenue)} tone="positive" />
              <Stat label="Cost" value={formatPHP(totalCost)} tone="info" />
              <Stat label="Gross Profit" value={formatPHP(totalProfit)} tone={totalProfit >= 0 ? "positive" : "danger"} />
              <Stat label="Events" value={String(completedEvents.length)} />
            </div>
            <Card>
              <div className="mb-2 text-sm font-semibold">Revenue by Service</div>
              {pieData.length === 0 ? <div className="text-xs text-slate-500">No completed events yet.</div> : (
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatPHP(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                {pieData.map((d, i) => (
                  <div key={d.name}>
                    <div className="mx-auto h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                    <div className="mt-1 font-medium">{d.name}</div>
                    <div className="text-slate-500">{formatPHP(d.value)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === "events" && (
          <>
            <Card>
              <div className="mb-2 text-sm font-semibold">Profit per Event</div>
              {costByEvent.length === 0 ? <div className="text-xs text-slate-500">No completed events.</div> : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={costByEvent}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => formatPHP(Number(v))} />
                      <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                      <Bar dataKey="cost" fill="#f43f5e" name="Cost" />
                      <Bar dataKey="profit" fill="#10b981" name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </>
        )}

        {tab === "inventory" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Value" value={formatPHP(inventoryValue)} tone="info" />
              <Stat label="Low stock" value={String(lowStock)} tone={lowStock > 0 ? "warning" : "default"} />
              <Stat label="Out of stock" value={String(outOfStock)} tone={outOfStock > 0 ? "danger" : "default"} />
            </div>
            <Card>
              <div className="mb-2 text-sm font-semibold">Top consumed items</div>
              {usageByItem.length === 0 ? <div className="text-xs text-slate-500">No usage yet.</div> : (
                <div className="space-y-1 text-xs">
                  {usageByItem.map((u) => (
                    <div key={u.id} className="flex justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                      <span>{u.name}</span>
                      <span className="font-semibold">{formatPHP(u.cost)} ({u.qty.toFixed(2)} {u.unit})</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {tab === "profit" && (
          <>
            <Card>
              <div className="space-y-2 text-sm">
                <Row k="Total Revenue" v={formatPHP(totalRevenue)} />
                <Row k="Material costs" v={formatPHP(reqs.filter((r) => r.actualQty !== undefined).reduce((s, r) => s + (r.actualQty ?? 0) * r.historicalCostPerUnit, 0))} />
                <Row k="Labor / Transportation / Other" v={formatPHP(exps.filter((e) => !e.isEstimated).reduce((s, e) => s + e.amount, 0))} />
                <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
                <Row k="Total actual cost" v={formatPHP(totalCost)} bold />
                <Row k="Gross profit" v={formatPHP(totalProfit)} bold positive={totalProfit >= 0} />
                <Row k="Margin" v={`${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0}%`} bold positive={totalProfit >= 0} />
              </div>
            </Card>
          </>
        )}
      </div>
      <BottomNav />
    </Shell>
  );
}

function Row({ k, v, bold, positive }: { k: string; v: string; bold?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-300">{k}</span>
      <span className={(bold ? "font-semibold " : "") + (positive === true ? "text-emerald-600" : positive === false ? "text-red-600" : "")}>{v}</span>
    </div>
  );
}
