import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import {
  clearHistory,
  deleteScan,
  loadHistory,
  toggleFavorite,
  type ScanHistoryEntry,
} from "@/lib/history-store";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Scan history · PurePicks" },
      { name: "description", content: "Revisit past product scans and favorites." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  useEffect(() => setEntries(loadHistory()), []);
  const refresh = () => setEntries(loadHistory());

  const visible = filter === "favorites" ? entries.filter((e) => e.favorite) : entries;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Scan history
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Stored locally on this device.
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "favorites"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {visible.length === 0 ? (
          <div className="pop-card p-10 text-center">
            <p className="text-muted-foreground">No scans yet.</p>
            <Link
              to="/scan"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Start scanning →
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {visible.map((e) => (
              <li key={e.id} className="pop-card p-5">
                <div className="flex items-start gap-3">
                  {e.imageDataUrl && (
                    <img
                      src={e.imageDataUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold truncate">
                      {e.result.productName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.category} · {new Date(e.scannedAt).toLocaleString()}
                    </div>
                    <div
                      className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[10px] font-mono uppercase tracking-widest ${
                        e.result.verdict === "safe"
                          ? "bg-success/15 text-success"
                          : e.result.verdict === "caution"
                            ? "bg-warning/15 text-warning"
                            : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {e.result.verdict}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {e.result.summary}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      toggleFavorite(e.id);
                      refresh();
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                  >
                    {e.favorite ? "★ Favorited" : "☆ Favorite"}
                  </button>
                  <button
                    onClick={() => {
                      deleteScan(e.id);
                      refresh();
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {entries.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                if (confirm("Clear all scan history?")) {
                  clearHistory();
                  refresh();
                }
              }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all history
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
