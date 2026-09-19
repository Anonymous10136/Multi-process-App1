"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams, useRouter } from "next/navigation";
import { differenceInDays, format } from "date-fns";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Tabs } from "@/components/ui";
import { formatPHP, formatNumber, calcCostPerUnit } from "@/lib/currency";
import type { InventoryItem, ServiceKey, ItemType } from "@/lib/types";

const UNITS = [
  "piece",
  "pack",
  "box",
  "bundle",
  "set",
  "bottle",
  "can",
  "roll",
  "bag",
  "kg",
  "g",
  "liter",
  "ml",
  "meter",
  "pair",
  "hour",
  "guest",
  "custom",
];

export default function InventoryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const serviceFilter = (params.get("service") as ServiceKey | null) || "all";
  const stockFilter = params.get("filter") || "all";
  const query = params.get("q") || "";
  const actionParam = params.get("action");

  const items = useLiveQuery(() => db.inventoryItems.toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  const services = useLiveQuery(() => db.services.toArray(), []) || [];

  const [modalOpen, setModalOpen] = useState<boolean>(actionParam === "add");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (actionParam === "add") {
      setModalOpen(true);
      setEditing(null);
    }
  }, [actionParam]);

  const filtered = useMemo(() => {
    let list = items;
    if (serviceFilter !== "all") list = list.filter((i) => i.serviceKey === serviceFilter);
    const today = new Date();
    if (stockFilter === "low") list = list.filter((i) => i.quantity > 0 && i.quantity <= i.minimumStock);
    if (stockFilter === "out") list = list.filter((i) => i.quantity <= 0);
    if (stockFilter === "expiring")
      list = list.filter((i) => i.expirationDate && differenceInDays(new Date(i.expirationDate), today) >= 0 && differenceInDays(new Date(i.expirationDate), today) <= 7);
    if (stockFilter === "expired")
      list = list.filter((i) => i.expirationDate && differenceInDays(new Date(i.expirationDate), today) < 0);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.unit.toLowerCase().includes(q) ||
          (i.supplier || "").toLowerCase().includes(q) ||
          (i.storageLocation || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, serviceFilter, stockFilter, query]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "grazing", label: "Grazing", emoji: "🧀" },
    { key: "photobooth", label: "Photobooth", emoji: "📸" },
    { key: "wine", label: "Wine Bar", emoji: "🍷" },
    { key: "shared", label: "Shared", emoji: "📦" },
  ];

  const serviceMap = new Map(services.map((s) => [s.key, s]));

  return (
    <Shell>
      <PageHeader
        title="Inventory"
        subtitle={`${filtered.length} items`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + Add
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        <Input
          placeholder="Search items, suppliers, locations…"
          value={query}
          onChange={(e) => {
            const p = new URLSearchParams(params.toString());
            if (e.target.value) p.set("q", e.target.value);
            else p.delete("q");
            router.replace(`/inventory?${p.toString()}`);
          }}
        />
        <Tabs
          tabs={tabs}
          value={serviceFilter}
          onChange={(k) => {
            const p = new URLSearchParams(params.toString());
            if (k === "all") p.delete("service");
            else p.set("service", k);
            router.replace(`/inventory?${p.toString()}`);
          }}
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { k: "all", l: "All" },
            { k: "low", l: "Low Stock" },
            { k: "out", l: "Out of Stock" },
            { k: "expiring", l: "Expiring" },
            { k: "expired", l: "Expired" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => {
                const p = new URLSearchParams(params.toString());
                if (f.k === "all") p.delete("filter");
                else p.set("filter", f.k);
                router.replace(`/inventory?${p.toString()}`);
              }}
              className={
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium " +
                (stockFilter === f.k
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")
              }
            >
              {f.l}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No inventory items"
            description="Add items to start tracking your stock."
            action={
              <Button onClick={() => setModalOpen(true)}>+ Add Inventory</Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((it) => {
              const today = new Date();
              const exp = it.expirationDate ? differenceInDays(new Date(it.expirationDate), today) : null;
              const low = it.quantity > 0 && it.quantity <= it.minimumStock;
              const out = it.quantity <= 0;
              const cat = categories.find((c) => c.id === it.categoryId);
              const svc = serviceMap.get(it.serviceKey);
              return (
                <Card key={it.id} onClick={() => setDetailItem(it)} className="hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
                      {svc?.emoji || "📦"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {it.name}
                        </div>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {cat && <Badge tone="slate">{cat.name}</Badge>}
                        <Badge tone={it.type === "consumable" ? "violet" : "sky"}>
                          {it.type}
                        </Badge>
                        {out ? (
                          <Badge tone="red">Out of Stock</Badge>
                        ) : low ? (
                          <Badge tone="amber">Low Stock</Badge>
                        ) : null}
                        {exp !== null && exp < 0 ? (
                          <Badge tone="red">Expired</Badge>
                        ) : exp !== null && exp <= 7 ? (
                          <Badge tone="amber">Exp in {exp}d</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {formatNumber(it.quantity, 2)} {it.unit}
                          </span>
                          {it.reserved > 0 && ` · ${formatNumber(it.reserved)} reserved`}
                          {it.minimumStock > 0 && ` · min ${formatNumber(it.minimumStock)}`}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatPHP(it.costPerUnit)}/{it.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ItemModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          if (actionParam === "add") {
            const p = new URLSearchParams(params.toString());
            p.delete("action");
            router.replace(`/inventory?${p.toString()}`);
          }
        }}
        editing={editing}
        serviceDefault={serviceFilter === "all" ? "grazing" : serviceFilter}
        categories={categories}
      />

      <ItemDetail
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={(it) => {
          setDetailItem(null);
          setEditing(it);
          setModalOpen(true);
        }}
      />

      <BottomNav />
    </Shell>
  );
}

function ItemModal({
  open,
  onClose,
  editing,
  serviceDefault,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  editing: InventoryItem | null;
  serviceDefault: ServiceKey;
  categories: Array<{ id?: number; serviceKey: ServiceKey; name: string }>;
}) {
  const [form, setForm] = useState<Partial<InventoryItem>>({
    serviceKey: serviceDefault,
    type: "consumable",
    unit: "piece",
    quantity: 0,
    reserved: 0,
    minimumStock: 5,
    purchasePrice: 0,
    purchaseUnit: "piece",
    qtyPerPurchaseUnit: 1,
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...editing });
      } else {
        setForm({
          serviceKey: serviceDefault,
          type: "consumable",
          unit: "piece",
          quantity: 0,
          reserved: 0,
          minimumStock: 5,
          purchasePrice: 0,
          purchaseUnit: "piece",
          qtyPerPurchaseUnit: 1,
        });
      }
    }
  }, [open, editing, serviceDefault]);

  const costPerUnit = calcCostPerUnit(form.purchasePrice || 0, form.qtyPerPurchaseUnit || 1);
  const filteredCats = categories.filter((c) => c.serviceKey === form.serviceKey);

  async function save() {
    if (!form.name || !form.name.trim()) {
      alert("Item name is required.");
      return;
    }
    if ((form.qtyPerPurchaseUnit || 0) <= 0) {
      alert("Quantity per purchase unit must be greater than 0.");
      return;
    }
    const now = new Date().toISOString();
    const payload: InventoryItem = {
      ...(editing || {}),
      ...(form as InventoryItem),
      costPerUnit,
      updatedAt: now,
      createdAt: editing?.createdAt || now,
    };
    if (editing?.id !== undefined) {
      // Record cost history if cost changed
      const prev = editing;
      const prevId = prev.id!;
      if (prev.costPerUnit !== costPerUnit) {
        await db.costHistory.add({
          inventoryItemId: prevId,
          date: now,
          purchasePrice: payload.purchasePrice,
          qtyPerPurchaseUnit: payload.qtyPerPurchaseUnit,
          costPerUnit,
          supplier: payload.supplier,
        });
      }
      await db.inventoryItems.update(prevId, payload);
    } else {
      await db.inventoryItems.add(payload);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Inventory Item" : "Add Inventory Item"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label required>Item Name</Label>
          <Input
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Cheese Assortment"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Service</Label>
            <Select
              value={form.serviceKey || "grazing"}
              onChange={(e) => setForm({ ...form, serviceKey: e.target.value as ServiceKey, categoryId: undefined })}
            >
              <option value="grazing">🧀 Grazing Table</option>
              <option value="photobooth">📸 Photobooth</option>
              <option value="wine">🍷 Mobile Wine Bar</option>
              <option value="shared">📦 Shared</option>
            </Select>
          </div>
          <div>
            <Label required>Type</Label>
            <Select
              value={form.type || "consumable"}
              onChange={(e) => setForm({ ...form, type: e.target.value as ItemType })}
            >
              <option value="consumable">Consumable</option>
              <option value="reusable">Reusable / Equipment</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Category</Label>
          <Select
            value={form.categoryId ? String(form.categoryId) : ""}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">— None —</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Unit</Label>
            <Select
              value={form.unit || "piece"}
              onChange={(e) => {
                const v = e.target.value;
                setForm({
                  ...form,
                  unit: v,
                  purchaseUnit: form.purchaseUnit === form.unit ? v : form.purchaseUnit,
                });
              }}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Current Quantity</Label>
            <Input
              type="number"
              step="0.01"
              value={form.quantity ?? 0}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Minimum Stock</Label>
            <Input
              type="number"
              step="0.01"
              value={form.minimumStock ?? 0}
              onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Storage Location</Label>
            <Input
              value={form.storageLocation || ""}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
              placeholder="e.g., Pantry"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Purchase & Cost
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Purchase Unit</Label>
              <Select
                value={form.purchaseUnit || "piece"}
                onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Qty per Purchase Unit</Label>
              <Input
                type="number"
                step="0.01"
                value={form.qtyPerPurchaseUnit ?? 1}
                onChange={(e) => setForm({ ...form, qtyPerPurchaseUnit: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Purchase Price (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.purchasePrice ?? 0}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Cost per {form.unit || "unit"}</Label>
              <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300">
                {formatPHP(costPerUnit)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Supplier</Label>
            <Input
              value={form.supplier || ""}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </div>
          <div>
            <Label>Batch Number</Label>
            <Input
              value={form.batchNumber || ""}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Purchase Date</Label>
            <Input
              type="date"
              value={form.purchaseDate || ""}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Expiration Date</Label>
            <Input
              type="date"
              value={form.expirationDate || ""}
              onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-900"
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}

function ItemDetail({
  item,
  onClose,
  onEdit,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onEdit: (it: InventoryItem) => void;
}) {
  if (!item) return null;
  const today = new Date();
  const exp = item.expirationDate ? differenceInDays(new Date(item.expirationDate), today) : null;
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item.name}
      footer={
        <>
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm(`Delete "${item.name}"?`)) {
                await db.inventoryItems.delete(item.id!);
                onClose();
              }
            }}
          >
            Delete
          </Button>
          <Button onClick={() => onEdit(item)}>Edit</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="In stock" value={`${formatNumber(item.quantity)} ${item.unit}`} />
          <StatBox label="Reserved" value={`${formatNumber(item.reserved)} ${item.unit}`} />
          <StatBox label="Available" value={`${formatNumber(item.quantity - (item.reserved || 0))} ${item.unit}`} />
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <KV k="Purchase" v={`${formatPHP(item.purchasePrice)} / ${item.qtyPerPurchaseUnit} ${item.purchaseUnit}`} />
            <KV k="Cost per unit" v={`${formatPHP(item.costPerUnit)} / ${item.unit}`} />
            <KV k="Minimum stock" v={`${formatNumber(item.minimumStock)} ${item.unit}`} />
            <KV k="Supplier" v={item.supplier || "—"} />
            <KV k="Storage" v={item.storageLocation || "—"} />
            <KV k="Batch" v={item.batchNumber || "—"} />
            <KV k="Purchased" v={item.purchaseDate ? format(new Date(item.purchaseDate), "MMM d, yyyy") : "—"} />
            <KV
              k="Expires"
              v={
                item.expirationDate
                  ? `${format(new Date(item.expirationDate), "MMM d, yyyy")} (${exp! >= 0 ? `in ${exp}d` : `${Math.abs(exp!)}d ago`})`
                  : "—"
              }
            />
          </div>
        </div>
        {item.notes && (
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Notes</div>
            <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{item.notes}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="truncate font-medium text-slate-800 dark:text-slate-100">{v}</div>
    </div>
  );
}
