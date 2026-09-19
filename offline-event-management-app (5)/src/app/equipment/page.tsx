"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, PageHeader, Select, Tabs } from "@/components/ui";
import type { Equipment, EquipmentStatus, ServiceKey } from "@/lib/types";

const STATUS_OPTIONS: EquipmentStatus[] = [
  "available",
  "assigned",
  "in_use",
  "needs_maintenance",
  "damaged",
  "under_repair",
  "missing",
  "unavailable",
];

const STATUS_TONE: Record<EquipmentStatus, "green" | "indigo" | "amber" | "red" | "slate"> = {
  available: "green",
  assigned: "indigo",
  in_use: "indigo",
  needs_maintenance: "amber",
  damaged: "red",
  under_repair: "amber",
  missing: "red",
  unavailable: "slate",
};

export default function EquipmentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const action = params.get("action");
  const filter = (params.get("service") as ServiceKey | null) || "all";
  const items = useLiveQuery(() => db.equipment.toArray(), []) || [];
  const [modalOpen, setModalOpen] = useState(action === "add");
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [detail, setDetail] = useState<Equipment | null>(null);

  useEffect(() => { if (action === "add") setModalOpen(true); }, [action]);

  const filtered = filter === "all" ? items : items.filter((i) => i.serviceKey === filter);

  return (
    <Shell>
      <PageHeader title="Equipment" subtitle={`${filtered.length} items`} actions={<Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Add</Button>} />
      <div className="space-y-3 p-4">
        <Tabs
          tabs={[
            { key: "all", label: "All" },
            { key: "grazing", label: "Grazing", emoji: "🧀" },
            { key: "photobooth", label: "Photobooth", emoji: "📸" },
            { key: "wine", label: "Wine Bar", emoji: "🍷" },
            { key: "shared", label: "Shared", emoji: "📦" },
          ]}
          value={filter}
          onChange={(k) => {
            const p = new URLSearchParams(params.toString());
            if (k === "all") p.delete("service"); else p.set("service", k);
            router.replace(`/equipment?${p.toString()}`);
          }}
        />
        {filtered.length === 0 ? (
          <EmptyState icon="🔧" title="No equipment" description="Add your first equipment." />
        ) : (
          <div className="space-y-2">
            {filtered.map((it) => (
              <Card key={it.id} onClick={() => setDetail(it)} className="hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{it.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {it.availableQty} / {it.totalQty} available · {it.storageLocation || "—"}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[it.status]}>{it.status.replace("_", " ")}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <EquipModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          if (action === "add") {
            const p = new URLSearchParams(params.toString());
            p.delete("action");
            router.replace(`/equipment?${p.toString()}`);
          }
        }}
        editing={editing}
      />
      <EquipDetail item={detail} onClose={() => setDetail(null)} onEdit={(e) => { setDetail(null); setEditing(e); setModalOpen(true); }} />
      <BottomNav />
    </Shell>
  );
}

function EquipModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Equipment | null }) {
  const [form, setForm] = useState<Partial<Equipment>>({
    serviceKey: "shared",
    name: "",
    totalQty: 1,
    availableQty: 1,
    assignedQty: 0,
    condition: "good",
    status: "available",
  });
  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : { serviceKey: "shared", name: "", totalQty: 1, availableQty: 1, assignedQty: 0, condition: "good", status: "available" });
    }
  }, [open, editing]);

  async function save() {
    if (!form.name?.trim()) { alert("Name is required."); return; }
    if (editing?.id) await db.equipment.update(editing.id, form as Equipment);
    else await db.equipment.add(form as Equipment);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Equipment" : "Add Equipment"} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="space-y-3">
        <div><Label required>Name</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Service</Label>
            <Select value={form.serviceKey || "shared"} onChange={(e) => setForm({ ...form, serviceKey: e.target.value as ServiceKey })}>
              <option value="grazing">🧀 Grazing</option>
              <option value="photobooth">📸 Photobooth</option>
              <option value="wine">🍷 Wine Bar</option>
              <option value="shared">📦 Shared</option>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status || "available"} onChange={(e) => setForm({ ...form, status: e.target.value as EquipmentStatus })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Total Qty</Label><Input type="number" value={form.totalQty ?? 1} onChange={(e) => setForm({ ...form, totalQty: Number(e.target.value) })} /></div>
          <div><Label>Available</Label><Input type="number" value={form.availableQty ?? 1} onChange={(e) => setForm({ ...form, availableQty: Number(e.target.value) })} /></div>
          <div><Label>Assigned</Label><Input type="number" value={form.assignedQty ?? 0} onChange={(e) => setForm({ ...form, assignedQty: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Condition</Label>
            <Select value={form.condition || "good"} onChange={(e) => setForm({ ...form, condition: e.target.value as Equipment["condition"] })}>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </Select>
          </div>
          <div><Label>Storage</Label><Input value={form.storageLocation || ""} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} /></div>
        </div>
        <div><Label>Notes</Label><textarea className="min-h-[70px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function EquipDetail({ item, onClose, onEdit }: { item: Equipment | null; onClose: () => void; onEdit: (e: Equipment) => void }) {
  if (!item) return null;
  return (
    <Modal open={!!item} onClose={onClose} title={item.name} footer={<><Button variant="danger" onClick={async () => { if (confirm(`Delete "${item.name}"?`)) { await db.equipment.delete(item.id!); onClose(); } }}>Delete</Button><Button onClick={() => onEdit(item)}>Edit</Button></>}>
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <StatBox l="Total" v={String(item.totalQty)} />
          <StatBox l="Available" v={String(item.availableQty)} />
          <StatBox l="Assigned" v={String(item.assignedQty)} />
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="grid grid-cols-2 gap-2">
            <KV k="Status" v={item.status.replace("_", " ")} />
            <KV k="Condition" v={item.condition} />
            <KV k="Storage" v={item.storageLocation || "—"} />
            <KV k="Service" v={item.serviceKey} />
          </div>
        </div>
        {item.notes && <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">{item.notes}</div>}
      </div>
    </Modal>
  );
}
function StatBox({ l, v }: { l: string; v: string }) {
  return (<div className="rounded-xl border border-slate-200 p-2 text-center dark:border-slate-800"><div className="text-[10px] uppercase text-slate-500">{l}</div><div className="font-bold">{v}</div></div>);
}
function KV({ k, v }: { k: string; v: string }) {
  return (<div><div className="text-[10px] uppercase text-slate-500">{k}</div><div className="font-medium capitalize">{v}</div></div>);
}
