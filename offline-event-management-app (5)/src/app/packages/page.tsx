"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Tabs } from "@/components/ui";
import { formatPHP, formatNumber } from "@/lib/currency";
import { computePackageCost, type PackageCostSummary } from "@/lib/costing";
import type { Package, PackageItem, PackageAdditionalCost, ServiceKey } from "@/lib/types";

export default function PackagesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const action = params.get("action");
  const serviceFilter = (params.get("service") as ServiceKey | null) || "all";

  const packages = useLiveQuery(() => db.packages.toArray(), []) || [];
  const items = useLiveQuery(() => db.inventoryItems.toArray(), []) || [];
  const pkgItems = useLiveQuery(() => db.packageItems.toArray(), []) || [];
  const addCosts = useLiveQuery(() => db.packageAdditionalCosts.toArray(), []) || [];

  const [modalOpen, setModalOpen] = useState<boolean>(action === "add");
  const [editing, setEditing] = useState<Package | null>(null);
  const [viewPkg, setViewPkg] = useState<Package | null>(null);

  useEffect(() => {
    if (action === "add") setModalOpen(true);
  }, [action]);

  const filtered = useMemo(() => {
    let list = packages;
    if (serviceFilter !== "all") list = list.filter((p) => p.serviceKey === serviceFilter);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [packages, serviceFilter]);

  // Precompute cost summaries for display
  const [costMap, setCostMap] = useState<Record<number, PackageCostSummary>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<number, PackageCostSummary> = {};
      for (const p of filtered) {
        const sum = await computePackageCost(p.id!, 1);
        if (sum) out[p.id!] = sum;
      }
      if (!cancelled) setCostMap(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered.length, items.length, pkgItems.length, addCosts.length]);

  return (
    <Shell>
      <PageHeader
        title="Packages"
        subtitle={`${filtered.length} packages`}
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
            + Add
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        <Tabs
          tabs={[
            { key: "all", label: "All" },
            { key: "grazing", label: "Grazing", emoji: "🧀" },
            { key: "photobooth", label: "Photobooth", emoji: "📸" },
            { key: "wine", label: "Wine Bar", emoji: "🍷" },
          ]}
          value={serviceFilter}
          onChange={(k) => {
            const p = new URLSearchParams(params.toString());
            if (k === "all") p.delete("service");
            else p.set("service", k);
            router.replace(`/packages?${p.toString()}`);
          }}
        />

        {filtered.length === 0 ? (
          <EmptyState icon="🎁" title="No packages yet" description="Create your first service package." />
        ) : (
          <div className="space-y-3">
            {filtered.map((pkg) => {
              const sum = costMap[pkg.id!];
              const serviceEmoji = pkg.serviceKey === "grazing" ? "🧀" : pkg.serviceKey === "photobooth" ? "📸" : "🍷";
              return (
                <Card key={pkg.id} onClick={() => setViewPkg(pkg)} className="cursor-pointer hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{serviceEmoji}</span>
                        <div className="text-sm font-semibold">{pkg.name}</div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {pkg.pax ? <Badge tone="indigo">{pkg.pax} pax</Badge> : null}
                        {pkg.printQty ? <Badge tone="indigo">{pkg.printQty} prints</Badge> : null}
                        {pkg.durationHours ? <Badge tone="indigo">{pkg.durationHours}h</Badge> : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">Price</div>
                      <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                        {formatPHP(pkg.sellingPrice)}
                      </div>
                    </div>
                  </div>
                  {sum && (
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Cost</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {formatPHP(sum.totalEstimatedCost)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Profit</div>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatPHP(sum.grossProfit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Margin</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {sum.grossMarginPct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PackageModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          if (action === "add") {
            const p = new URLSearchParams(params.toString());
            p.delete("action");
            router.replace(`/packages?${p.toString()}`);
          }
        }}
        editing={editing}
      />

      <PackageDetail pkg={viewPkg} onClose={() => setViewPkg(null)} onEdit={(p) => { setViewPkg(null); setEditing(p); setModalOpen(true); }} />

      <BottomNav />
    </Shell>
  );
}

function PackageModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Package | null;
}) {
  const [form, setForm] = useState<Partial<Package>>({
    serviceKey: "grazing",
    name: "",
    pax: 100,
    sellingPrice: 0,
  });

  useEffect(() => {
    if (open) {
      if (editing) setForm({ ...editing });
      else setForm({ serviceKey: "grazing", name: "", pax: 100, sellingPrice: 0 });
    }
  }, [open, editing]);

  async function save() {
    if (!form.name?.trim()) {
      alert("Package name is required.");
      return;
    }
    if (editing?.id) {
      await db.packages.update(editing.id, form as Package);
    } else {
      await db.packages.add({ ...form, createdAt: new Date().toISOString() } as Package);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Package" : "New Package"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label required>Package Name</Label>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Grazing Table — 100 Pax" />
        </div>
        <div>
          <Label required>Service</Label>
          <Select value={form.serviceKey || "grazing"} onChange={(e) => setForm({ ...form, serviceKey: e.target.value as ServiceKey })}>
            <option value="grazing">🧀 Grazing Table</option>
            <option value="photobooth">📸 Photobooth</option>
            <option value="wine">🍷 Mobile Wine Bar</option>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Pax</Label>
            <Input type="number" value={form.pax ?? 0} onChange={(e) => setForm({ ...form, pax: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Prints</Label>
            <Input type="number" value={form.printQty ?? 0} onChange={(e) => setForm({ ...form, printQty: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Hours</Label>
            <Input type="number" value={form.durationHours ?? 0} onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label required>Selling Price (₱)</Label>
          <Input type="number" step="0.01" value={form.sellingPrice ?? 0} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Description</Label>
          <textarea
            className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}

function PackageDetail({
  pkg,
  onClose,
  onEdit,
}: {
  pkg: Package | null;
  onClose: () => void;
  onEdit: (p: Package) => void;
}) {
  const [multiplier, setMultiplier] = useState(1);
  const [summary, setSummary] = useState<PackageCostSummary | null>(null);

  useEffect(() => {
    if (!pkg) return;
    let cancelled = false;
    computePackageCost(pkg.id!, multiplier).then((s) => {
      if (!cancelled) setSummary(s);
    });
    return () => { cancelled = true; };
  }, [pkg, multiplier]);

  useEffect(() => {
    if (pkg) setMultiplier(1);
  }, [pkg?.id]);

  if (!pkg) return null;

  const serviceLabel = pkg.serviceKey === "grazing" ? "Grazing Table" : pkg.serviceKey === "photobooth" ? "Photobooth" : "Mobile Wine Bar";
  const scaleLabel = pkg.serviceKey === "grazing" ? `Pax (${pkg.pax || 100} base)` : pkg.serviceKey === "photobooth" ? `Prints (${pkg.printQty || 160} base)` : `Pax/Hours`;

  return (
    <Modal
      open={!!pkg}
      onClose={onClose}
      title={pkg.name}
      footer={
        <>
          <Button variant="danger" onClick={async () => {
            if (confirm(`Delete package "${pkg.name}"? This also removes its items.`)) {
              await db.transaction("rw", [db.packages, db.packageItems, db.packageAdditionalCosts], async () => {
                await db.packageItems.where("packageId").equals(pkg.id!).delete();
                await db.packageAdditionalCosts.where("packageId").equals(pkg.id!).delete();
                await db.packages.delete(pkg.id!);
              });
              onClose();
            }
          }}>Delete</Button>
          <Button onClick={() => onEdit(pkg)}>Edit</Button>
        </>
      }
    >
      {summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Service</div>
              <div className="font-semibold">{serviceLabel}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Selling Price</div>
              <div className="font-semibold text-indigo-600 dark:text-indigo-400">{formatPHP(summary.sellingPrice)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 dark:border-slate-800 dark:from-indigo-950/40 dark:to-violet-950/40">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <span>Scale ({scaleLabel})</span>
              <span>{multiplier.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-2 flex gap-2">
              {[0.5, 1, 1.5, 2, 2.5, 3].map((m) => (
                <button key={m} onClick={() => setMultiplier(m)} className={"rounded-full px-2.5 py-0.5 text-[11px] font-medium " + (Math.abs(m - multiplier) < 0.001 ? "bg-indigo-600 text-white" : "bg-white/70 text-slate-700 dark:bg-slate-800 dark:text-slate-200")}>
                  {m}×
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Material Requirements</div>
            <div className="space-y-1.5">
              {summary.lines.map((l) => (
                <div key={l.packageItemId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.itemName}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatNumber(l.requiredQty)} {l.unit} × {formatPHP(l.costPerUnit)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPHP(l.materialCost)}</div>
                    <div className="text-[10px]">
                      <span className={l.status === "available" ? "text-emerald-600" : l.status === "insufficient" ? "text-amber-600" : "text-red-600"}>
                        {l.status === "available" ? `+${formatNumber(l.difference)} ok` : l.status === "insufficient" ? `${formatNumber(l.difference)} short` : "out"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {summary.additionalCosts.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Additional Costs</div>
              <div className="space-y-1">
                {summary.additionalCosts.map((a) => (
                  <div key={a.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                    <span>{a.label} {a.kind !== "fixed" ? `(${a.kind})` : ""}</span>
                    <span className="font-medium">{formatPHP(a.amount * (a.kind === "fixed" ? 1 : multiplier))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <Row label="Total material cost" value={formatPHP(summary.totalMaterialCost)} />
            <Row label="Total purchase cost (rounded packs)" value={formatPHP(summary.totalPurchaseCost)} dim />
            <Row label="Additional costs" value={formatPHP(summary.totalAdditionalCost)} />
            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
            <Row label="Estimated event cost" value={formatPHP(summary.totalEstimatedCost)} bold />
            <Row label="Gross profit" value={formatPHP(summary.grossProfit)} bold positive={summary.grossProfit >= 0} />
            <Row label="Gross margin" value={`${summary.grossMarginPct.toFixed(2)}%`} bold positive={summary.grossMarginPct >= 0} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, bold, positive, dim }: { label: string; value: string; bold?: boolean; positive?: boolean; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={dim ? "text-slate-500" : "text-slate-600 dark:text-slate-300"}>{label}</span>
      <span className={(bold ? "font-semibold " : "") + (positive === true ? "text-emerald-600 dark:text-emerald-400" : positive === false ? "text-red-600" : "text-slate-800 dark:text-slate-100")}>{value}</span>
    </div>
  );
}
