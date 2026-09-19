import { db } from "./db";
import type {
  Package,
  PackageItem,
  PackageAdditionalCost,
  InventoryItem,
} from "./types";
import { calcCostPerUnit, purchaseUnitsRequired } from "./currency";

export interface PackageCostLine {
  packageItemId: number;
  inventoryItemId: number;
  itemName: string;
  unit: string;
  requiredQty: number;
  costPerUnit: number;
  materialCost: number;
  qtyPerPurchaseUnit: number;
  purchasePrice: number;
  purchaseUnitsNeeded: number;
  purchaseCost: number;
  available: number;
  difference: number;
  status: "available" | "insufficient" | "out";
}

export interface PackageCostSummary {
  pkg: Package;
  lines: PackageCostLine[];
  additionalCosts: PackageAdditionalCost[];
  totalMaterialCost: number;
  totalPurchaseCost: number;
  totalAdditionalCost: number;
  totalEstimatedCost: number;
  sellingPrice: number;
  grossProfit: number;
  grossMarginPct: number;
  multiplier: number;
}

/**
 * Compute the scaled cost summary for a package at a given scale factor.
 * multiplier = (actual pax / base pax) or (actual prints / base prints) or (hours / base hours).
 */
export async function computePackageCost(
  packageId: number,
  multiplier: number = 1
): Promise<PackageCostSummary | null> {
  const pkg = await db.packages.get(packageId);
  if (!pkg) return null;

  const pkgItems = await db.packageItems.where("packageId").equals(packageId).toArray();
  const addCosts = await db.packageAdditionalCosts
    .where("packageId")
    .equals(packageId)
    .toArray();
  const invIds = pkgItems.map((p) => p.inventoryItemId);
  const invItems = invIds.length ? await db.inventoryItems.bulkGet(invIds) : [];
  const invMap = new Map<number, InventoryItem>();
  invItems.forEach((i) => {
    if (i) invMap.set(i.id!, i);
  });

  const lines: PackageCostLine[] = pkgItems.map((pi) => {
    const item = invMap.get(pi.inventoryItemId);
    if (!item) {
      return {
        packageItemId: pi.id!,
        inventoryItemId: pi.inventoryItemId,
        itemName: "Unknown",
        unit: "",
        requiredQty: 0,
        costPerUnit: 0,
        materialCost: 0,
        qtyPerPurchaseUnit: 0,
        purchasePrice: 0,
        purchaseUnitsNeeded: 0,
        purchaseCost: 0,
        available: 0,
        difference: 0,
        status: "out" as const,
      };
    }
    // Scale based on scaleMode relative to multiplier
    let requiredQty = pi.standardQty;
    if (pi.scaleMode === "pax" || pi.scaleMode === "prints" || pi.scaleMode === "duration") {
      requiredQty = pi.standardQty * multiplier;
    }

    const costPerUnit = item.costPerUnit ?? calcCostPerUnit(item.purchasePrice, item.qtyPerPurchaseUnit);
    const materialCost = requiredQty * costPerUnit;
    const purchaseUnitsNeeded = purchaseUnitsRequired(requiredQty, item.qtyPerPurchaseUnit);
    const purchaseCost = purchaseUnitsNeeded * item.purchasePrice;

    const available = item.quantity - (item.reserved || 0);
    const difference = available - requiredQty;
    const status: PackageCostLine["status"] =
      available <= 0 ? "out" : difference < 0 ? "insufficient" : "available";

    return {
      packageItemId: pi.id!,
      inventoryItemId: item.id!,
      itemName: item.name,
      unit: item.unit,
      requiredQty,
      costPerUnit,
      materialCost,
      qtyPerPurchaseUnit: item.qtyPerPurchaseUnit,
      purchasePrice: item.purchasePrice,
      purchaseUnitsNeeded,
      purchaseCost,
      available,
      difference,
      status,
    };
  });

  const totalMaterialCost = lines.reduce((s, l) => s + l.materialCost, 0);
  const totalPurchaseCost = lines.reduce((s, l) => s + l.purchaseCost, 0);

  // Compute additional cost considering kind (per_pax / per_hour multiply by multiplier; fixed stays)
  const totalAdditionalCost = addCosts.reduce((s, ac) => {
    if (ac.kind === "per_pax" || ac.kind === "per_hour") {
      return s + ac.amount * multiplier;
    }
    return s + ac.amount;
  }, 0);

  const totalEstimatedCost = totalMaterialCost + totalAdditionalCost;
  const sellingPrice = pkg.sellingPrice;
  const grossProfit = sellingPrice - totalEstimatedCost;
  const grossMarginPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  return {
    pkg,
    lines,
    additionalCosts: addCosts,
    totalMaterialCost,
    totalPurchaseCost,
    totalAdditionalCost,
    totalEstimatedCost,
    sellingPrice,
    grossProfit,
    grossMarginPct,
    multiplier,
  };
}

/**
 * Default multiplier for a package based on its service & defaults.
 */
export function defaultMultiplier(pkg: Package): number {
  if (pkg.serviceKey === "grazing") {
    const pax = pkg.pax || 100;
    return pax / (pkg.pax || 100);
  }
  if (pkg.serviceKey === "photobooth") {
    const prints = pkg.printQty || 160;
    return prints / (pkg.printQty || 160);
  }
  if (pkg.serviceKey === "wine") {
    const pax = pkg.pax || 100;
    const hours = pkg.durationHours || 3;
    // use pax as primary scale; hours as secondary — simple combined multiplier
    return (pax / (pkg.pax || 100)) * (hours / (pkg.durationHours || 3));
  }
  return 1;
}
