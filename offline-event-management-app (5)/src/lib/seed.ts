import { db } from "./db";
import type {
  Service,
  Category,
  InventoryItem,
  Package,
  PackageItem,
  PackageAdditionalCost,
} from "./types";
import { calcCostPerUnit } from "./currency";

export const DEFAULT_SERVICES: Omit<Service, "id">[] = [
  { key: "grazing", name: "Grazing Table", emoji: "🧀" },
  { key: "photobooth", name: "Photobooth", emoji: "📸" },
  { key: "wine", name: "Mobile Wine Bar", emoji: "🍷" },
  { key: "shared", name: "Shared / General", emoji: "📦" },
];

export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  // Grazing Table
  { serviceKey: "grazing", name: "Cheese" },
  { serviceKey: "grazing", name: "Cold Cuts" },
  { serviceKey: "grazing", name: "Fruits" },
  { serviceKey: "grazing", name: "Crackers & Bread" },
  { serviceKey: "grazing", name: "Nuts & Dried Fruits" },
  { serviceKey: "grazing", name: "Sweets & Chocolates" },
  { serviceKey: "grazing", name: "Spreads & Condiments" },
  { serviceKey: "grazing", name: "Disposable Supplies" },
  { serviceKey: "grazing", name: "Serving Equipment" },
  { serviceKey: "grazing", name: "Decorations" },

  // Photobooth
  { serviceKey: "photobooth", name: "Printing Materials" },
  { serviceKey: "photobooth", name: "Photobooth Equipment" },
  { serviceKey: "photobooth", name: "Props" },
  { serviceKey: "photobooth", name: "Backdrops" },

  // Wine Bar
  { serviceKey: "wine", name: "Wine" },
  { serviceKey: "wine", name: "Mixers & Beverages" },
  { serviceKey: "wine", name: "Garnishes" },
  { serviceKey: "wine", name: "Bar Consumables" },
  { serviceKey: "wine", name: "Bar Supplies" },
  { serviceKey: "wine", name: "Glassware & Bar Equipment" },

  // Shared
  { serviceKey: "shared", name: "General Supplies" },
  { serviceKey: "shared", name: "General Equipment" },
];

function expDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const today = new Date().toISOString().slice(0, 10);

export const SAMPLE_INVENTORY: Omit<InventoryItem, "id">[] = [
  // Grazing
  {
    serviceKey: "grazing",
    name: "Cheese Assortment",
    type: "consumable",
    unit: "kg",
    quantity: 15,
    reserved: 0,
    minimumStock: 5,
    purchasePrice: 800,
    purchaseUnit: "kg",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(800, 1),
    supplier: "Manila Cheese Co.",
    purchaseDate: today,
    expirationDate: expDays(10),
    storageLocation: "Refrigerator A",
  },
  {
    serviceKey: "grazing",
    name: "Cold Cuts (Salami, Ham)",
    type: "consumable",
    unit: "kg",
    quantity: 10,
    reserved: 0,
    minimumStock: 4,
    purchasePrice: 650,
    purchaseUnit: "kg",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(650, 1),
    purchaseDate: today,
    expirationDate: expDays(5),
    storageLocation: "Refrigerator A",
  },
  {
    serviceKey: "grazing",
    name: "Fresh Fruits (Grapes, Berries)",
    type: "consumable",
    unit: "kg",
    quantity: 8,
    reserved: 0,
    minimumStock: 3,
    purchasePrice: 250,
    purchaseUnit: "kg",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(250, 1),
    purchaseDate: today,
    expirationDate: expDays(3),
    storageLocation: "Refrigerator B",
  },
  {
    serviceKey: "grazing",
    name: "Crackers",
    type: "consumable",
    unit: "pack",
    quantity: 40,
    reserved: 0,
    minimumStock: 15,
    purchasePrice: 150,
    purchaseUnit: "pack",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(150, 1),
    purchaseDate: today,
    expirationDate: expDays(90),
    storageLocation: "Pantry",
  },
  {
    serviceKey: "grazing",
    name: "Mixed Nuts",
    type: "consumable",
    unit: "kg",
    quantity: 6,
    reserved: 0,
    minimumStock: 2,
    purchasePrice: 550,
    purchaseUnit: "kg",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(550, 1),
    purchaseDate: today,
    expirationDate: expDays(60),
    storageLocation: "Pantry",
  },
  {
    serviceKey: "grazing",
    name: "Disposable Plates",
    type: "consumable",
    unit: "piece",
    quantity: 500,
    reserved: 0,
    minimumStock: 200,
    purchasePrice: 300,
    purchaseUnit: "pack",
    qtyPerPurchaseUnit: 100,
    costPerUnit: calcCostPerUnit(300, 100),
    storageLocation: "Storage Room",
  },
  {
    serviceKey: "grazing",
    name: "Napkins",
    type: "consumable",
    unit: "piece",
    quantity: 800,
    reserved: 0,
    minimumStock: 300,
    purchasePrice: 200,
    purchaseUnit: "pack",
    qtyPerPurchaseUnit: 100,
    costPerUnit: calcCostPerUnit(200, 100),
    storageLocation: "Storage Room",
  },
  {
    serviceKey: "grazing",
    name: "Wooden Serving Boards",
    type: "reusable",
    unit: "piece",
    quantity: 12,
    reserved: 0,
    minimumStock: 4,
    purchasePrice: 1200,
    purchaseUnit: "piece",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(1200, 1),
    storageLocation: "Equipment Room",
  },

  // Photobooth
  {
    serviceKey: "photobooth",
    name: "4R Magnetic Sheets",
    type: "consumable",
    unit: "piece",
    quantity: 300,
    reserved: 0,
    minimumStock: 100,
    purchasePrice: 1600,
    purchaseUnit: "pack",
    qtyPerPurchaseUnit: 100,
    costPerUnit: calcCostPerUnit(1600, 100),
    storageLocation: "PB Storage",
  },
  {
    serviceKey: "photobooth",
    name: "4R Photopaper",
    type: "consumable",
    unit: "piece",
    quantity: 120,
    reserved: 0,
    minimumStock: 200,
    purchasePrice: 500,
    purchaseUnit: "pack",
    qtyPerPurchaseUnit: 100,
    costPerUnit: calcCostPerUnit(500, 100),
    storageLocation: "PB Storage",
  },
  {
    serviceKey: "photobooth",
    name: "Plastic Packaging",
    type: "consumable",
    unit: "piece",
    quantity: 600,
    reserved: 0,
    minimumStock: 200,
    purchasePrice: 300,
    purchaseUnit: "pack",
    qtyPerPurchaseUnit: 100,
    costPerUnit: calcCostPerUnit(300, 100),
    storageLocation: "PB Storage",
  },
  {
    serviceKey: "photobooth",
    name: "Photobooth Props Set",
    type: "reusable",
    unit: "set",
    quantity: 3,
    reserved: 0,
    minimumStock: 1,
    purchasePrice: 1500,
    purchaseUnit: "set",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(1500, 1),
    storageLocation: "PB Storage",
  },
  {
    serviceKey: "photobooth",
    name: "Backdrop",
    type: "reusable",
    unit: "piece",
    quantity: 4,
    reserved: 0,
    minimumStock: 2,
    purchasePrice: 2500,
    purchaseUnit: "piece",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(2500, 1),
    storageLocation: "PB Storage",
  },

  // Wine Bar
  {
    serviceKey: "wine",
    name: "Red Wine",
    type: "consumable",
    unit: "bottle",
    quantity: 20,
    reserved: 0,
    minimumStock: 8,
    purchasePrice: 600,
    purchaseUnit: "bottle",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(600, 1),
    storageLocation: "Wine Cellar",
  },
  {
    serviceKey: "wine",
    name: "White Wine",
    type: "consumable",
    unit: "bottle",
    quantity: 18,
    reserved: 0,
    minimumStock: 8,
    purchasePrice: 650,
    purchaseUnit: "bottle",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(650, 1),
    storageLocation: "Wine Cellar",
  },
  {
    serviceKey: "wine",
    name: "Sparkling Wine",
    type: "consumable",
    unit: "bottle",
    quantity: 8,
    reserved: 0,
    minimumStock: 4,
    purchasePrice: 900,
    purchaseUnit: "bottle",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(900, 1),
    storageLocation: "Wine Cellar",
  },
  {
    serviceKey: "wine",
    name: "Soda / Mixers",
    type: "consumable",
    unit: "liter",
    quantity: 25,
    reserved: 0,
    minimumStock: 10,
    purchasePrice: 80,
    purchaseUnit: "liter",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(80, 1),
    storageLocation: "Bar Storage",
  },
  {
    serviceKey: "wine",
    name: "Ice",
    type: "consumable",
    unit: "kg",
    quantity: 40,
    reserved: 0,
    minimumStock: 15,
    purchasePrice: 50,
    purchaseUnit: "kg",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(50, 1),
    storageLocation: "Freezer",
  },
  {
    serviceKey: "wine",
    name: "Wine Glasses",
    type: "reusable",
    unit: "piece",
    quantity: 80,
    reserved: 0,
    minimumStock: 30,
    purchasePrice: 150,
    purchaseUnit: "piece",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(150, 1),
    storageLocation: "Bar Storage",
  },
  {
    serviceKey: "wine",
    name: "Garnishes (Citrus, Herbs)",
    type: "consumable",
    unit: "kg",
    quantity: 5,
    reserved: 0,
    minimumStock: 2,
    purchasePrice: 200,
    purchaseUnit: "kg",
    qtyPerPurchaseUnit: 1,
    costPerUnit: calcCostPerUnit(200, 1),
    purchaseDate: today,
    expirationDate: expDays(4),
    storageLocation: "Refrigerator B",
  },
];

export async function seedDatabaseIfEmpty() {
  const serviceCount = await db.services.count();
  if (serviceCount > 0) return;

  await db.transaction(
    "rw",
    [db.services, db.categories, db.inventoryItems, db.packages, db.packageItems, db.packageAdditionalCosts, db.settings],
    async () => {
      await db.services.bulkAdd(DEFAULT_SERVICES);
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
      await db.inventoryItems.bulkAdd(SAMPLE_INVENTORY);

      const cats = await db.categories.toArray();
      const items = await db.inventoryItems.toArray();
      const findItem = (name: string) => items.find((i) => i.name === name);
      const findCat = (serviceKey: "grazing" | "photobooth" | "wine" | "shared", name: string) =>
        cats.find((c) => c.serviceKey === serviceKey && c.name === name);

      // Assign categories
      const assignments: Array<[string, string, "grazing" | "photobooth" | "wine" | "shared"]> = [
        ["Cheese Assortment", "Cheese", "grazing"],
        ["Cold Cuts (Salami, Ham)", "Cold Cuts", "grazing"],
        ["Fresh Fruits (Grapes, Berries)", "Fruits", "grazing"],
        ["Crackers", "Crackers & Bread", "grazing"],
        ["Mixed Nuts", "Nuts & Dried Fruits", "grazing"],
        ["Disposable Plates", "Disposable Supplies", "grazing"],
        ["Napkins", "Disposable Supplies", "grazing"],
        ["Wooden Serving Boards", "Serving Equipment", "grazing"],
        ["4R Magnetic Sheets", "Printing Materials", "photobooth"],
        ["4R Photopaper", "Printing Materials", "photobooth"],
        ["Plastic Packaging", "Printing Materials", "photobooth"],
        ["Photobooth Props Set", "Props", "photobooth"],
        ["Backdrop", "Backdrops", "photobooth"],
        ["Red Wine", "Wine", "wine"],
        ["White Wine", "Wine", "wine"],
        ["Sparkling Wine", "Wine", "wine"],
        ["Soda / Mixers", "Mixers & Beverages", "wine"],
        ["Ice", "Bar Supplies", "wine"],
        ["Wine Glasses", "Glassware & Bar Equipment", "wine"],
        ["Garnishes (Citrus, Herbs)", "Garnishes", "wine"],
      ];

      for (const [itemName, catName, serviceKey] of assignments) {
        const item = findItem(itemName);
        const cat = findCat(serviceKey, catName);
        if (item?.id && cat?.id) {
          await db.inventoryItems.update(item.id, { categoryId: cat.id });
        }
      }

      // Grazing Table 100 Pax package
      const grazingPkgId = await db.packages.add({
        serviceKey: "grazing",
        name: "Grazing Table — 100 Pax",
        pax: 100,
        sellingPrice: 15000,
        description: "Classic grazing table setup for 100 guests.",
        createdAt: today,
      } as Package);

      const grazingItems: Array<[string, number, "pax" | "fixed"]> = [
        ["Cheese Assortment", 8, "pax"],
        ["Cold Cuts (Salami, Ham)", 6, "pax"],
        ["Fresh Fruits (Grapes, Berries)", 10, "pax"],
        ["Crackers", 20, "pax"],
        ["Mixed Nuts", 3, "pax"],
        ["Disposable Plates", 120, "pax"],
        ["Napkins", 150, "pax"],
        ["Wooden Serving Boards", 4, "fixed"],
      ];
      for (const [name, qty, scaleMode] of grazingItems) {
        const it = findItem(name);
        if (it?.id) {
          await db.packageItems.add({
            packageId: grazingPkgId as number,
            inventoryItemId: it.id,
            standardQty: qty,
            scaleMode,
            baseValue: 100,
          } as PackageItem);
        }
      }
      await db.packageAdditionalCosts.bulkAdd([
        { packageId: grazingPkgId as number, label: "Transportation", amount: 500, kind: "fixed" } as PackageAdditionalCost,
        { packageId: grazingPkgId as number, label: "Labor", amount: 600, kind: "fixed" } as PackageAdditionalCost,
        { packageId: grazingPkgId as number, label: "Setup & Styling", amount: 400, kind: "fixed" } as PackageAdditionalCost,
      ]);

      // Photobooth 4R Magnetic Package
      const pbPkgId = await db.packages.add({
        serviceKey: "photobooth",
        name: "4R Magnetic — 160 Prints",
        printQty: 160,
        sellingPrice: 6500,
        description: "Photobooth package with 160 magnetic 4R prints.",
        createdAt: today,
      } as Package);
      const pbItems: Array<[string, number]> = [
        ["4R Magnetic Sheets", 160],
        ["4R Photopaper", 160],
        ["Plastic Packaging", 160],
      ];
      for (const [name, qty] of pbItems) {
        const it = findItem(name);
        if (it?.id) {
          await db.packageItems.add({
            packageId: pbPkgId as number,
            inventoryItemId: it.id,
            standardQty: qty,
            scaleMode: "prints",
            baseValue: 160,
          } as PackageItem);
        }
      }
      await db.packageAdditionalCosts.bulkAdd([
        { packageId: pbPkgId as number, label: "Transportation", amount: 500, kind: "fixed" } as PackageAdditionalCost,
        { packageId: pbPkgId as number, label: "Labor", amount: 300, kind: "fixed" } as PackageAdditionalCost,
      ]);

      // Wine Bar 100 Pax / 3 Hours
      const winePkgId = await db.packages.add({
        serviceKey: "wine",
        name: "Mobile Wine Bar — 100 Pax / 3h",
        pax: 100,
        durationHours: 3,
        sellingPrice: 12000,
        description: "Mobile wine bar service for 100 guests, 3 hours.",
        createdAt: today,
      } as Package);
      const wineItems: Array<[string, number, "pax" | "duration" | "fixed"]> = [
        ["Red Wine", 8, "pax"],
        ["White Wine", 8, "pax"],
        ["Sparkling Wine", 4, "pax"],
        ["Soda / Mixers", 6, "pax"],
        ["Ice", 15, "duration"],
        ["Wine Glasses", 60, "pax"],
        ["Garnishes (Citrus, Herbs)", 1, "pax"],
      ];
      for (const [name, qty, scaleMode] of wineItems) {
        const it = findItem(name);
        if (it?.id) {
          await db.packageItems.add({
            packageId: winePkgId as number,
            inventoryItemId: it.id,
            standardQty: qty,
            scaleMode,
            baseValue: scaleMode === "duration" ? 3 : 100,
          } as PackageItem);
        }
      }
      await db.packageAdditionalCosts.bulkAdd([
        { packageId: winePkgId as number, label: "Transportation", amount: 500, kind: "fixed" } as PackageAdditionalCost,
        { packageId: winePkgId as number, label: "Bartender", amount: 1500, kind: "fixed" } as PackageAdditionalCost,
        { packageId: winePkgId as number, label: "Setup", amount: 300, kind: "fixed" } as PackageAdditionalCost,
      ]);

      // Default settings
      await db.settings.bulkAdd([
        { key: "theme", value: JSON.stringify("system") },
        { key: "expirationWarningDays", value: JSON.stringify(7) },
        { key: "defaultMinStock", value: JSON.stringify(5) },
        { key: "remindersEnabled", value: JSON.stringify(true) },
        { key: "seeded", value: JSON.stringify(true) },
      ]);
    }
  );
}
