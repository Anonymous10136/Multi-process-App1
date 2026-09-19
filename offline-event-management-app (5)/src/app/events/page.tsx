"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Tabs } from "@/components/ui";
import { formatPHP, formatNumber } from "@/lib/currency";
import { computePackageCost } from "@/lib/costing";
import type {
  EventRecord,
  EventService,
  EventRequirement,
  EventExpense,
  EventStatus,
  ServiceKey,
  ChecklistItem,
} from "@/lib/types";

const STATUS_TONE: Record<EventStatus, "slate" | "indigo" | "violet" | "amber" | "green" | "red"> = {
  inquiry: "slate",
  tentative: "indigo",
  confirmed: "violet",
  preparing: "amber",
  completed: "green",
  cancelled: "red",
};

export default function EventsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const action = params.get("action");
  const filter = params.get("filter") || "upcoming";

  const events = useLiveQuery(() => db.events.toArray(), []) || [];
  const services = useLiveQuery(() => db.services.toArray(), []) || [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) || [];

  const [modalOpen, setModalOpen] = useState<boolean>(action === "add");
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [viewEvent, setViewEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    if (action === "add") setModalOpen(true);
  }, [action]);

  const filtered = useMemo(() => {
    const today = new Date();
    let list = events;
    if (filter === "upcoming") list = list.filter((e) => new Date(e.date) >= today && e.status !== "completed" && e.status !== "cancelled");
    if (filter === "today") list = list.filter((e) => isSameDay(new Date(e.date), today));
    if (filter === "past") list = list.filter((e) => new Date(e.date) < today || e.status === "completed");
    if (filter === "completed") list = list.filter((e) => e.status === "completed");
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [events, filter]);

  return (
    <Shell>
      <PageHeader
        title="Events"
        subtitle={`${filtered.length} events`}
        actions={<Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Add</Button>}
      />
      <div className="space-y-3 p-4">
        <Tabs
          tabs={[
            { key: "upcoming", label: "Upcoming" },
            { key: "today", label: "Today" },
            { key: "past", label: "Past" },
            { key: "completed", label: "Completed" },
          ]}
          value={filter}
          onChange={(k) => {
            const p = new URLSearchParams(params.toString());
            p.set("filter", k);
            router.replace(`/events?${p.toString()}`);
          }}
        />

        {filtered.length === 0 ? (
          <EmptyState icon="📅" title="No events" description="Plan your first event." />
        ) : (
          <div className="space-y-2">
            {filtered.map((ev) => {
              const svcEmojis = ev.name;
              return (
                <EventCard key={ev.id} ev={ev} onOpen={() => setViewEvent(ev)} />
              );
            })}
          </div>
        )}
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          if (action === "add") {
            const p = new URLSearchParams(params.toString());
            p.delete("action");
            router.replace(`/events?${p.toString()}`);
          }
        }}
        editing={editing}
      />

      <EventDetail ev={viewEvent} onClose={() => setViewEvent(null)} />

      <BottomNav />
    </Shell>
  );
}

async function computeEventTotals(eventId: number) {
  const evSvcs = await db.eventServices.where("eventId").equals(eventId).toArray();
  const reqs = await db.eventRequirements.where("eventId").equals(eventId).toArray();
  const exps = await db.eventExpenses.where("eventId").equals(eventId).toArray();

  let estimatedCost = 0;
  let actualMatCost = 0;
  for (const es of evSvcs) {
    if (es.packageId) {
      const sum = await computePackageCost(es.packageId, es.multiplier);
      if (sum) estimatedCost += sum.totalEstimatedCost;
    }
  }
  actualMatCost = reqs.reduce((s, r) => s + (r.actualQty ?? 0) * r.historicalCostPerUnit, 0);
  const estExp = exps.filter((e) => e.isEstimated).reduce((s, e) => s + e.amount, 0);
  const actExp = exps.filter((e) => !e.isEstimated).reduce((s, e) => s + e.amount, 0);

  return { estimatedCost: estimatedCost + estExp, actualCost: actualMatCost + actExp };
}

function EventCard({ ev, onOpen }: { ev: EventRecord; onOpen: () => void }) {
  const [totals, setTotals] = useState({ estimatedCost: 0, actualCost: 0 });
  const [svcKeys, setSvcKeys] = useState<ServiceKey[]>([]);
  useEffect(() => {
    let cancelled = false;
    computeEventTotals(ev.id!).then((t) => !cancelled && setTotals(t));
    db.eventServices.where("eventId").equals(ev.id!).toArray().then((s) => !cancelled && setSvcKeys(s.map((x) => x.serviceKey)));
    return () => { cancelled = true; };
  }, [ev.id]);

  const emojiMap: Record<ServiceKey, string> = { grazing: "🧀", photobooth: "📸", wine: "🍷", shared: "📦" };

  return (
    <Card onClick={onOpen} className="hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold truncate">{ev.name}</div>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[ev.status]}>{ev.status}</Badge>
            {svcKeys.map((k) => (
              <Badge key={k} tone="slate">{emojiMap[k]} {k === "grazing" ? "Grazing" : k === "photobooth" ? "PB" : k === "wine" ? "Wine" : "Shared"}</Badge>
            ))}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {format(new Date(ev.date), "MMM d, yyyy")}
            {ev.startTime && ` · ${ev.startTime}`}
            {ev.venue && ` · ${ev.venue}`}
          </div>
          <div className="mt-1 text-xs text-slate-500">{ev.client}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Revenue</div>
          <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatPHP(ev.revenue)}</div>
          {ev.status === "completed" && (
            <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Profit {formatPHP((ev.actualRevenue ?? ev.revenue) - totals.actualCost)}
            </div>
          )}
          {ev.status !== "completed" && ev.status !== "cancelled" && (
            <div className="text-[10px] text-slate-500">
              Est. {formatPHP(totals.estimatedCost)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function EventModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: EventRecord | null }) {
  const packages = useLiveQuery(() => db.packages.toArray(), []) || [];
  const [form, setForm] = useState<Partial<EventRecord>>({
    name: "",
    client: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "10:00",
    venue: "",
    status: "inquiry",
    revenue: 0,
  });
  const [selectedSvcs, setSelectedSvcs] = useState<Array<{ serviceKey: ServiceKey; packageId?: number; multiplier: number }>>([]);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...editing });
        db.eventServices.where("eventId").equals(editing.id!).toArray().then((es) => {
          setSelectedSvcs(es.map((s) => ({ serviceKey: s.serviceKey, packageId: s.packageId, multiplier: s.multiplier })));
        });
      } else {
        setForm({
          name: "", client: "", date: format(new Date(), "yyyy-MM-dd"), startTime: "10:00", venue: "", status: "inquiry", revenue: 0,
        });
        setSelectedSvcs([]);
      }
    }
  }, [open, editing]);

  function toggleService(key: ServiceKey) {
    const exists = selectedSvcs.find((s) => s.serviceKey === key);
    if (exists) setSelectedSvcs(selectedSvcs.filter((s) => s.serviceKey !== key));
    else {
      // Default package for service
      const def = packages.find((p) => p.serviceKey === key);
      setSelectedSvcs([...selectedSvcs, { serviceKey: key, packageId: def?.id, multiplier: 1 }]);
    }
  }

  async function save() {
    if (!form.name?.trim() || !form.client?.trim() || !form.date) {
      alert("Name, client, and date are required.");
      return;
    }

    await db.transaction("rw", [db.events, db.eventServices, db.eventRequirements, db.eventExpenses, db.inventoryItems, db.checklistItems, db.packages, db.packageItems], async () => {
      let eventId: number;
      if (editing?.id) {
        await db.events.update(editing.id, form as EventRecord);
        eventId = editing.id;
        await db.eventServices.where("eventId").equals(eventId).delete();
        await db.eventRequirements.where("eventId").equals(eventId).delete();
      } else {
        eventId = (await db.events.add({ ...form, createdAt: new Date().toISOString() } as EventRecord)) as number;
      }

      // Save services and requirements
      for (const svc of selectedSvcs) {
        const esId = (await db.eventServices.add({
          eventId,
          serviceKey: svc.serviceKey,
          packageId: svc.packageId,
          multiplier: svc.multiplier,
        } as EventService)) as number;

        if (svc.packageId) {
          const sum = await computePackageCost(svc.packageId, svc.multiplier);
          if (sum) {
            for (const line of sum.lines) {
              await db.eventRequirements.add({
                eventId,
                eventServiceId: esId,
                inventoryItemId: line.inventoryItemId,
                plannedQty: line.requiredQty,
                historicalCostPerUnit: line.costPerUnit,
              } as EventRequirement);
            }
            // Seed estimated additional costs
            if (!editing?.id) {
              for (const ac of sum.additionalCosts) {
                const amt = ac.kind === "fixed" ? ac.amount : ac.amount * svc.multiplier;
                await db.eventExpenses.add({
                  eventId,
                  category: ac.label,
                  amount: amt,
                  isEstimated: true,
                } as EventExpense);
              }
            }
          }
        }
      }

      // Auto-generate checklist for new events
      if (!editing?.id) {
        const defaultTasks: Record<ServiceKey, string[]> = {
          grazing: ["Prepare cheese & cold cuts", "Prepare fruits", "Pack serving boards", "Pack plates & napkins", "Load decorations", "Confirm venue setup"],
          photobooth: ["Test camera & printer", "Load photopaper & magnetic sheets", "Pack props & backdrop", "Check extension cords", "Confirm booth layout"],
          wine: ["Chill wine", "Prepare ice", "Pack wine glasses", "Prepare garnishes", "Load bar setup", "Confirm bartender schedule"],
          shared: ["Confirm transportation", "Print event summary"],
        };
        for (const svc of selectedSvcs) {
          for (const t of defaultTasks[svc.serviceKey]) {
            await db.checklistItems.add({ eventId, serviceKey: svc.serviceKey, task: t, completed: false } as ChecklistItem);
          }
        }
      }

      // Reserve inventory for non-completed events
      if (form.status !== "completed" && form.status !== "cancelled") {
        // Reset all reservations for this event, then reserve based on current requirements
        // (simpler: recalculate all reserved quantities globally across all active events)
        await recalcReservations();
      }
    });

    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Event" : "New Event"}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Save</Button>
      </>}
    >
      <div className="space-y-3">
        <div>
          <Label required>Event Name</Label>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Wedding — Smith-Jones" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Client</Label>
            <Input value={form.client || ""} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Wedding, Birthday…" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label required>Date</Label>
            <Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Start</Label>
            <Input type="time" value={form.startTime || ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="time" value={form.endTime || ""} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Venue</Label>
          <Input value={form.venue || ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={form.status || "inquiry"} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}>
              <option value="inquiry">Inquiry</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div>
            <Label>Revenue (₱)</Label>
            <Input type="number" value={form.revenue || 0} onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })} />
          </div>
        </div>

        <div>
          <Label>Services</Label>
          <div className="flex flex-wrap gap-2">
            {(["grazing", "photobooth", "wine"] as ServiceKey[]).map((k) => {
              const active = selectedSvcs.some((s) => s.serviceKey === k);
              const emoji = k === "grazing" ? "🧀" : k === "photobooth" ? "📸" : "🍷";
              const name = k === "grazing" ? "Grazing Table" : k === "photobooth" ? "Photobooth" : "Mobile Wine Bar";
              return (
                <button key={k} onClick={() => toggleService(k)} className={"rounded-full px-3 py-1.5 text-xs font-medium transition " + (active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                  {emoji} {name}
                </button>
              );
            })}
          </div>
          {selectedSvcs.length > 0 && (
            <div className="mt-2 space-y-2">
              {selectedSvcs.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                    {s.serviceKey === "grazing" ? "🧀 Grazing" : s.serviceKey === "photobooth" ? "📸 Photobooth" : "🍷 Wine"}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={s.packageId ? String(s.packageId) : ""}
                      onChange={(e) => {
                        const next = [...selectedSvcs];
                        next[idx] = { ...next[idx], packageId: Number(e.target.value) || undefined };
                        setSelectedSvcs(next);
                      }}
                    >
                      <option value="">— No package —</option>
                      {packages.filter((p) => p.serviceKey === s.serviceKey).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Scale ×"
                      value={s.multiplier}
                      onChange={(e) => {
                        const next = [...selectedSvcs];
                        next[idx] = { ...next[idx], multiplier: Number(e.target.value) };
                        setSelectedSvcs(next);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Notes</Label>
          <textarea className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

async function recalcReservations() {
  // Reset reserved on all items
  const items = await db.inventoryItems.toArray();
  for (const it of items) await db.inventoryItems.update(it.id!, { reserved: 0 });

  // Sum planned requirements for active (not completed/cancelled) events
  const activeEvents = await db.events.where("status").noneOf(["completed", "cancelled"]).toArray();
  const activeIds = new Set(activeEvents.map((e) => e.id!));
  const allReqs = await db.eventRequirements.toArray();
  const sums = new Map<number, number>();
  for (const r of allReqs) {
    if (activeIds.has(r.eventId)) {
      sums.set(r.inventoryItemId, (sums.get(r.inventoryItemId) || 0) + r.plannedQty);
    }
  }
  for (const [itemId, qty] of sums) {
    await db.inventoryItems.update(itemId, { reserved: qty });
  }
}

function EventDetail({ ev, onClose }: { ev: EventRecord | null; onClose: () => void }) {
  const [svcs, setSvcs] = useState<EventService[]>([]);
  const [reqs, setReqs] = useState<EventRequirement[]>([]);
  const [exps, setExps] = useState<EventExpense[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [totals, setTotals] = useState({ estimatedCost: 0, actualCost: 0 });
  const [tab, setTab] = useState<"summary" | "usage" | "expenses" | "checklist">("summary");
  const [actualOverrides, setActualOverrides] = useState<Record<number, string>>({});
  const [newExpCat, setNewExpCat] = useState("");
  const [newExpAmt, setNewExpAmt] = useState("");

  const items = useLiveQuery(() => db.inventoryItems.toArray(), []) || [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) || [];
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const pkgMap = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);

  useEffect(() => {
    if (!ev) return;
    db.eventServices.where("eventId").equals(ev.id!).toArray().then(setSvcs);
    db.eventRequirements.where("eventId").equals(ev.id!).toArray().then(setReqs);
    db.eventExpenses.where("eventId").equals(ev.id!).toArray().then(setExps);
    db.checklistItems.where("eventId").equals(ev.id!).toArray().then(setChecklist);
    computeEventTotals(ev.id!).then(setTotals);
  }, [ev?.id]);

  if (!ev) return null;

  async function saveActualUsage() {
    if (!ev?.id) return;
    const evId = ev.id;
    await db.transaction("rw", [db.eventRequirements, db.inventoryItems, db.events, db.eventServices, db.equipment, db.equipmentAssignments], async () => {
      for (const r of reqs) {
        const val = actualOverrides[r.id!];
        if (val !== undefined && val !== "") {
          const qty = Number(val);
          if (qty < 0) throw new Error(`Negative actual qty for item ${r.inventoryItemId}`);
          await db.eventRequirements.update(r.id!, { actualQty: qty });
        }
      }
      // Refresh after updates
      const updatedReqs = await db.eventRequirements.where("eventId").equals(evId).toArray();
      const itemMap2 = new Map(items.map((i) => [i.id, i]));
      for (const r of updatedReqs) {
        if (r.actualQty !== undefined) {
          const item = itemMap2.get(r.inventoryItemId);
          if (item && item.type === "consumable") {
            const newQty = Math.max(0, item.quantity - r.actualQty);
            await db.inventoryItems.update(item.id!, { quantity: newQty });
          }
        }
      }
      await db.events.update(evId, { status: "completed", completedAt: new Date().toISOString() });
      await recalcReservations();
    });
    onClose();
  }

  async function addExpense() {
    if (!ev?.id) return;
    const evId = ev.id;
    if (!newExpCat || !newExpAmt) return;
    await db.eventExpenses.add({
      eventId: evId,
      category: newExpCat,
      amount: Number(newExpAmt),
      isEstimated: false,
    } as EventExpense);
    setNewExpCat("");
    setNewExpAmt("");
    const e = await db.eventExpenses.where("eventId").equals(evId).toArray();
    setExps(e);
    computeEventTotals(evId).then(setTotals);
  }

  async function toggleChecklist(id: number) {
    const c = checklist.find((x) => x.id === id);
    if (!c) return;
    await db.checklistItems.update(id, { completed: !c.completed });
    setChecklist(checklist.map((x) => (x.id === id ? { ...x, completed: !x.completed } : x)));
  }

  const actualRevenue = ev.actualRevenue ?? ev.revenue;
  const actualProfit = actualRevenue - totals.actualCost;

  return (
    <Modal open={!!ev} onClose={onClose} title={ev.name}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <KV k="Client" v={ev.client} />
          <KV k="Status" v={ev.status} />
          <KV k="Date" v={format(new Date(ev.date), "MMM d, yyyy")} />
          <KV k="Venue" v={ev.venue || "—"} />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(["summary", "usage", "expenses", "checklist"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={"rounded-full px-2 py-1 text-[11px] font-medium capitalize " + (tab === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
              {t}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Services</div>
              {svcs.length === 0 ? <div className="text-xs text-slate-500">No services assigned.</div> : svcs.map((s) => (
                <div key={s.id} className="mb-1 flex items-center justify-between text-xs">
                  <span>{s.serviceKey === "grazing" ? "🧀" : s.serviceKey === "photobooth" ? "📸" : "🍷"} {s.packageId ? pkgMap.get(s.packageId)?.name : "No package"}</span>
                  <span className="font-medium">{s.multiplier.toFixed(2)}×</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 p-3 text-xs dark:border-slate-800">
              <Row label="Planned revenue" value={formatPHP(ev.revenue)} />
              <Row label="Estimated cost" value={formatPHP(totals.estimatedCost)} />
              <Row label="Estimated profit" value={formatPHP(ev.revenue - totals.estimatedCost)} positive={ev.revenue - totals.estimatedCost >= 0} />
              {ev.status === "completed" && <>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <Row label="Actual revenue" value={formatPHP(actualRevenue)} bold />
                <Row label="Actual cost" value={formatPHP(totals.actualCost)} />
                <Row label="Actual profit" value={formatPHP(actualProfit)} bold positive={actualProfit >= 0} />
              </>}
            </div>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Inventory Requirements (Planned)</div>
              <div className="space-y-1">
                {reqs.length === 0 ? <div className="text-xs text-slate-500">None.</div> : reqs.map((r) => {
                  const item = itemMap.get(r.inventoryItemId);
                  return (
                    <div key={r.id} className="flex justify-between text-xs">
                      <span className="truncate">{item?.name || "?"}</span>
                      <span className="ml-2 shrink-0 font-medium">
                        {formatNumber(r.plannedQty)} {item?.unit || ""}
                        {r.actualQty !== undefined && <span className="ml-1 text-emerald-600">/ {formatNumber(r.actualQty)}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "usage" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Enter actual quantities consumed. On completion, consumables will be deducted from inventory.</p>
            {reqs.length === 0 ? <EmptyState icon="📋" title="No requirements" /> : reqs.map((r) => {
              const item = itemMap.get(r.inventoryItemId);
              return (
                <div key={r.id} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{item?.name}</span>
                    <span className="text-slate-500">Planned: {formatNumber(r.plannedQty)} {item?.unit}</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`Actual ${item?.unit || ""}`}
                    value={actualOverrides[r.id!] ?? (r.actualQty ?? "")}
                    onChange={(e) => setActualOverrides({ ...actualOverrides, [r.id!]: e.target.value })}
                  />
                </div>
              );
            })}
            {ev.status !== "completed" && ev.status !== "cancelled" && (
              <Button className="w-full" onClick={saveActualUsage}>Mark Completed & Deduct Inventory</Button>
            )}
            {ev.status === "completed" && <Badge tone="green">Event Completed</Badge>}
          </div>
        )}

        {tab === "expenses" && (
          <div className="space-y-2">
            <div className="space-y-1">
              {exps.length === 0 ? <EmptyState icon="💸" title="No expenses" /> : exps.map((e) => (
                <div key={e.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                  <span>{e.category} {e.isEstimated && <Badge tone="amber">est.</Badge>}</span>
                  <span className="font-semibold">{formatPHP(e.amount)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Category (e.g., Fuel)" value={newExpCat} onChange={(e) => setNewExpCat(e.target.value)} />
              <Input type="number" placeholder="Amount ₱" value={newExpAmt} onChange={(e) => setNewExpAmt(e.target.value)} />
            </div>
            <Button onClick={addExpense} className="w-full">Add Actual Expense</Button>
          </div>
        )}

        {tab === "checklist" && (
          <div className="space-y-1">
            {checklist.length === 0 ? <EmptyState icon="✅" title="No checklist" /> : checklist.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                <input type="checkbox" checked={c.completed} onChange={() => toggleChecklist(c.id!)} className="h-4 w-4 accent-indigo-600" />
                <span className={c.completed ? "line-through opacity-60" : ""}>{c.task}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="truncate font-semibold capitalize">{v}</div>
    </div>
  );
}
function Row({ label, value, bold, positive }: { label: string; value: string; bold?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className={(bold ? "font-semibold " : "") + (positive === true ? "text-emerald-600" : positive === false ? "text-red-600" : "")}>{value}</span>
    </div>
  );
}
