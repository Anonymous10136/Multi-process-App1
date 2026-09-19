"use client";

import { useRef, useState } from "react";
import { db } from "@/lib/db";
import { Shell, BottomNav } from "@/components/Shell";
import { Button, Card, PageHeader } from "@/components/ui";
import { format } from "date-fns";

export default function BackupPage() {
  const [status, setStatus] = useState<string>("");
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function createBackup() {
    const data: Record<string, unknown> = {};
    const tables: Array<keyof typeof db & string> = [
      "services", "categories", "inventoryItems", "costHistory", "packages",
      "packageItems", "packageAdditionalCosts", "events", "eventServices",
      "eventRequirements", "eventExpenses", "equipment", "equipmentAssignments",
      "checklistItems", "settings",
    ];
    for (const t of tables) {
      data[t] = await (db[t] as unknown as { toArray(): Promise<unknown[]> }).toArray();
    }
    (data as { exportedAt: string }).exportedAt = new Date().toISOString();
    (data as { version: number }).version = 1;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventops-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Backup exported successfully.");
  }

  async function onImport(file: File) {
    if (!file) return;
    if (!confirm("This will REPLACE all current data with the backup. Continue?")) return;
    try {
      const txt = await file.text();
      const data = JSON.parse(txt);
      await db.transaction(
        "rw",
        [
          db.services, db.categories, db.inventoryItems, db.costHistory, db.packages,
          db.packageItems, db.packageAdditionalCosts, db.events, db.eventServices,
          db.eventRequirements, db.eventExpenses, db.equipment, db.equipmentAssignments,
          db.checklistItems, db.settings,
        ],
        async () => {
          await db.services.clear();
          await db.categories.clear();
          await db.inventoryItems.clear();
          await db.costHistory.clear();
          await db.packages.clear();
          await db.packageItems.clear();
          await db.packageAdditionalCosts.clear();
          await db.events.clear();
          await db.eventServices.clear();
          await db.eventRequirements.clear();
          await db.eventExpenses.clear();
          await db.equipment.clear();
          await db.equipmentAssignments.clear();
          await db.checklistItems.clear();
          await db.settings.clear();

          if (data.services) await db.services.bulkAdd(data.services);
          if (data.categories) await db.categories.bulkAdd(data.categories);
          if (data.inventoryItems) await db.inventoryItems.bulkAdd(data.inventoryItems);
          if (data.costHistory) await db.costHistory.bulkAdd(data.costHistory);
          if (data.packages) await db.packages.bulkAdd(data.packages);
          if (data.packageItems) await db.packageItems.bulkAdd(data.packageItems);
          if (data.packageAdditionalCosts) await db.packageAdditionalCosts.bulkAdd(data.packageAdditionalCosts);
          if (data.events) await db.events.bulkAdd(data.events);
          if (data.eventServices) await db.eventServices.bulkAdd(data.eventServices);
          if (data.eventRequirements) await db.eventRequirements.bulkAdd(data.eventRequirements);
          if (data.eventExpenses) await db.eventExpenses.bulkAdd(data.eventExpenses);
          if (data.equipment) await db.equipment.bulkAdd(data.equipment);
          if (data.equipmentAssignments) await db.equipmentAssignments.bulkAdd(data.equipmentAssignments);
          if (data.checklistItems) await db.checklistItems.bulkAdd(data.checklistItems);
          if (data.settings) await db.settings.bulkAdd(data.settings);
        }
      );
      setStatus("Backup restored successfully. Reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setStatus("Restore failed: " + (e as Error).message);
    }
  }

  async function resetData() {
    if (!confirm("This will DELETE ALL DATA. This cannot be undone. Continue?")) return;
    await db.delete();
    setStatus("All data deleted. Reloading…");
    setTimeout(() => window.location.reload(), 1200);
  }

  return (
    <Shell>
      <PageHeader title="Backup & Restore" />
      <div className="space-y-3 p-4">
        <Card>
          <div className="mb-3 text-sm font-semibold">Create Backup</div>
          <p className="mb-3 text-xs text-slate-500">
            Export all your data as a JSON file you can restore later.
          </p>
          <Button onClick={createBackup} className="w-full">⬇ Export Backup</Button>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold">Restore from Backup</div>
          <p className="mb-3 text-xs text-slate-500">
            Importing a backup will overwrite all current data. Make sure to export your current data first.
          </p>
          <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileInput.current?.click()} className="w-full">⬆ Import Backup</Button>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-red-600">Danger Zone</div>
          <p className="mb-3 text-xs text-slate-500">
            Permanently delete all data and reset the app.
          </p>
          <Button variant="danger" onClick={resetData} className="w-full">Delete All Data</Button>
        </Card>

        {status && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            {status}
          </div>
        )}
      </div>
      <BottomNav />
    </Shell>
  );
}
