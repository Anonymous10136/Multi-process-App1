import Dexie, { type Table } from "dexie";
import type {
  Service,
  Category,
  InventoryItem,
  CostHistoryEntry,
  Package,
  PackageItem,
  PackageAdditionalCost,
  EventRecord,
  EventService,
  EventRequirement,
  EventExpense,
  Equipment,
  EquipmentAssignment,
  ChecklistItem,
  AppSettings,
} from "./types";

export class AppDatabase extends Dexie {
  services!: Table<Service, number>;
  categories!: Table<Category, number>;
  inventoryItems!: Table<InventoryItem, number>;
  costHistory!: Table<CostHistoryEntry, number>;
  packages!: Table<Package, number>;
  packageItems!: Table<PackageItem, number>;
  packageAdditionalCosts!: Table<PackageAdditionalCost, number>;
  events!: Table<EventRecord, number>;
  eventServices!: Table<EventService, number>;
  eventRequirements!: Table<EventRequirement, number>;
  eventExpenses!: Table<EventExpense, number>;
  equipment!: Table<Equipment, number>;
  equipmentAssignments!: Table<EquipmentAssignment, number>;
  checklistItems!: Table<ChecklistItem, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super("EventOpsDB");
    this.version(1).stores({
      services: "++id, &key",
      categories: "++id, serviceKey, name",
      inventoryItems:
        "++id, serviceKey, categoryId, name, type, expirationDate, [serviceKey+type], quantity",
      costHistory: "++id, inventoryItemId, date",
      packages: "++id, serviceKey, name",
      packageItems: "++id, packageId, inventoryItemId",
      packageAdditionalCosts: "++id, packageId",
      events: "++id, date, status, client",
      eventServices: "++id, eventId, serviceKey",
      eventRequirements: "++id, eventId, eventServiceId, inventoryItemId",
      eventExpenses: "++id, eventId",
      equipment: "++id, serviceKey, status",
      equipmentAssignments: "++id, eventId, equipmentId",
      checklistItems: "++id, eventId, serviceKey",
      settings: "++id, &key",
    });
  }
}

export const db = new AppDatabase();
