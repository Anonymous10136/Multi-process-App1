// Core domain types for the offline-first event management app.

export type ServiceKey = "grazing" | "photobooth" | "wine" | "shared";

export type ItemType = "consumable" | "reusable";

export type EquipmentStatus =
  | "available"
  | "assigned"
  | "in_use"
  | "needs_maintenance"
  | "damaged"
  | "under_repair"
  | "missing"
  | "unavailable";

export type EventStatus =
  | "inquiry"
  | "tentative"
  | "confirmed"
  | "preparing"
  | "completed"
  | "cancelled";

export interface Service {
  id?: number;
  key: ServiceKey;
  name: string;
  emoji: string;
}

export interface Category {
  id?: number;
  serviceKey: ServiceKey;
  name: string;
  icon?: string;
}

export interface InventoryItem {
  id?: number;
  serviceKey: ServiceKey;
  categoryId?: number;
  name: string;
  type: ItemType;
  unit: string; // piece, kg, bottle, ml, pack, etc.
  quantity: number;
  reserved: number; // reserved for planned events
  minimumStock: number;
  purchasePrice: number;
  purchaseUnit: string;
  qtyPerPurchaseUnit: number;
  costPerUnit: number; // computed: purchasePrice / qtyPerPurchaseUnit
  standardEventQty?: number;
  supplier?: string;
  purchaseDate?: string;
  expirationDate?: string;
  batchNumber?: string;
  storageLocation?: string;
  photo?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostHistoryEntry {
  id?: number;
  inventoryItemId: number;
  date: string;
  purchasePrice: number;
  qtyPerPurchaseUnit: number;
  costPerUnit: number;
  supplier?: string;
  notes?: string;
}

export interface Package {
  id?: number;
  serviceKey: ServiceKey;
  name: string;
  description?: string;
  pax?: number; // grazing, wine
  printQty?: number; // photobooth
  durationHours?: number; // wine
  sellingPrice: number;
  createdAt?: string;
}

export interface PackageItem {
  id?: number;
  packageId: number;
  inventoryItemId: number;
  standardQty: number; // qty at base scale (base pax / base prints / base hours)
  // For scaling:
  scaleMode: "pax" | "prints" | "duration" | "fixed";
  baseValue: number; // e.g., 100 pax, 160 prints, 3 hours
}

export interface PackageAdditionalCost {
  id?: number;
  packageId: number;
  label: string;
  amount: number;
  kind: "fixed" | "per_pax" | "per_hour";
}

export interface EventRecord {
  id?: number;
  name: string;
  client: string;
  type?: string;
  date: string; // ISO date
  startTime?: string;
  endTime?: string;
  venue?: string;
  contact?: string;
  notes?: string;
  status: EventStatus;
  revenue: number;
  actualExpenses: number; // computed sum of eventExpenses
  actualRevenue?: number;
  createdAt?: string;
  completedAt?: string;
}

export interface EventService {
  id?: number;
  eventId: number;
  serviceKey: ServiceKey;
  packageId?: number;
  multiplier: number; // scale factor (e.g., pax/100, prints/160, hours/3)
  overrideSellingPrice?: number;
}

export interface EventRequirement {
  id?: number;
  eventId: number;
  eventServiceId: number;
  inventoryItemId: number;
  plannedQty: number;
  actualQty?: number;
  historicalCostPerUnit: number;
  overridden?: boolean;
}

export interface EventExpense {
  id?: number;
  eventId: number;
  category: string;
  amount: number;
  notes?: string;
  isEstimated?: boolean;
}

export interface Equipment {
  id?: number;
  serviceKey: ServiceKey;
  name: string;
  totalQty: number;
  availableQty: number;
  assignedQty: number;
  condition: "good" | "fair" | "poor";
  status: EquipmentStatus;
  storageLocation?: string;
  acquisitionDate?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
  photo?: string;
}

export interface EquipmentAssignment {
  id?: number;
  eventId: number;
  equipmentId: number;
  quantity: number;
  checkoutDate?: string;
  returnDate?: string;
  conditionBefore?: string;
  conditionAfter?: string;
  notes?: string;
}

export interface ChecklistItem {
  id?: number;
  eventId: number;
  serviceKey?: ServiceKey;
  task: string;
  completed: boolean;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string; // JSON encoded
}
