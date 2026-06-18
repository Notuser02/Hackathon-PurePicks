import type { ProductAnalysis } from "@/lib/ai.functions";

export type ScanHistoryEntry = {
  id: string;
  scannedAt: string;
  category: "skin" | "hair" | "food";
  imageDataUrl: string | null;
  favorite: boolean;
  result: ProductAnalysis;
};

const KEY = "purepicks.history.v1";
const MAX_ENTRIES = 200;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: ScanHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Likely quota exceeded; prune older entries aggressively
    const trimmed = entries.slice(0, Math.max(1, Math.floor(entries.length / 2)));
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      // Give up
    }
  }
}

export function addScanToHistory(params: {
  category: "skin" | "hair" | "food";
  imageDataUrl: string | null;
  result: ProductAnalysis;
}): ScanHistoryEntry {
  const entry: ScanHistoryEntry = {
    id: generateId(),
    scannedAt: new Date().toISOString(),
    category: params.category,
    imageDataUrl: params.imageDataUrl,
    favorite: false,
    result: params.result,
  };

  const existing = loadHistory();
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  saveHistory(next);
  return entry;
}

export function toggleFavorite(id: string) {
  const entries = loadHistory();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], favorite: !entries[idx].favorite };
  saveHistory(entries);
}

export function deleteScan(id: string) {
  const entries = loadHistory().filter((e) => e.id !== id);
  saveHistory(entries);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
