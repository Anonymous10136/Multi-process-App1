// Philippine Peso formatting helpers.

export function formatPHP(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatPHPShort(value: number | null | undefined): string {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
  return formatPHP(n);
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

export function calcCostPerUnit(purchasePrice: number, qtyPerPurchaseUnit: number): number {
  if (!qtyPerPurchaseUnit || qtyPerPurchaseUnit <= 0) return 0;
  return purchasePrice / qtyPerPurchaseUnit;
}

export function purchaseUnitsRequired(required: number, qtyPerPurchaseUnit: number): number {
  if (!qtyPerPurchaseUnit || qtyPerPurchaseUnit <= 0) return 0;
  return Math.ceil(required / qtyPerPurchaseUnit);
}
