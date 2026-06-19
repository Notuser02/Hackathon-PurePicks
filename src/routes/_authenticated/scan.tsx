import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { fileToDataUrl } from "@/lib/profile-store";
import { addScanToHistory } from "@/lib/history-store";
import {
  analyzeProduct,
  type ProductAnalysis,
  type ProductVerdict,
} from "@/lib/ai.functions";
import { getMyProfile, type ProfileRow } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a product · PurePicks" },
      {
        name: "description",
        content:
          "Photograph any ingredient label and PurePicks will translate it and tell you if it's safe for you.",
      },
    ],
  }),
  component: ScanPage,
});

type Category = "skin" | "hair" | "food";

function ScanPage() {
  const analyze = useServerFn(analyzeProduct);
  const fetchProfile = useServerFn(getMyProfile);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [category, setCategory] = useState<Category>("skin");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        if (p && p.completed && p.skin_type && p.hair_type) {
          setProfile(p);
          return;
        }
      } catch (e) {
        // ignore and fall back to local
      }

      // Fallback: check local profile
      const { loadProfile: loadLocalProfile } = await import("@/lib/profile-store");
      const local = loadLocalProfile();
      if (local && local.completed && local.skinType && local.hairType) {
        // Convert local shape to ProfileRow-like object
        const localRow = {
          user_id: "local",
          allergies: local.allergies ?? [],
          skin_type: local.skinType,
          skin_notes: local.skinNotes,
          hair_type: local.hairType,
          hair_notes: local.hairNotes,
          language: (local as any).language ?? "English",
          completed: !!local.completed,
        } as ProfileRow;
        setProfile(localRow);
        return;
      }

      // No completed profile, redirect to onboarding
      navigate({ to: "/onboarding" });
    })();
  }, [fetchProfile, navigate]);

  const onFile = async (file: File) => {
    if (!profile) return;
    setError(null);
    setResult(null);
    setSaved(false);
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setLoading(true);
    try {
      const r = await analyze({
        data: {
          imageDataUrl: dataUrl,
          category,
          allergies: profile.allergies ?? [],
          skinType: profile.skin_type,
          hairType: profile.hair_type,
          language: profile.language,
        },
      });
      setResult(r);
      addScanToHistory({ category, imageDataUrl: dataUrl, result: r });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Scanner {profile && `· ${profile.language}`}
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Is this safe for you?
            </h1>
          </div>
        </header>

        <section className="pop-card p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Category
            </span>
            {(["skin", "hair", "food"] as Category[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-dashed border-border bg-secondary/40 hover:border-primary"
            >
              {preview ? (
                <img src={preview} alt="product" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
                  <span className="grid h-16 w-16 place-items-center rounded-full border border-border bg-background text-3xl">
                    ◎
                  </span>
                  <span className="text-sm">Tap to photograph the ingredient label</span>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
            </button>

            <div className="min-h-[320px] rounded-2xl border border-border bg-secondary/20 p-6">
              {!preview && (
                <p className="text-sm text-muted-foreground">
                  Your verdict will appear here — translated into {profile?.language ?? "your language"}.
                </p>
              )}
              {loading && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  Reading the label, translating & checking your profile…
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}
              {result && (
                <div className="space-y-3">
                  {saved && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-[10px] font-medium text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Saved to history
                      </span>
                      <Link
                        to="/history"
                        className="text-[10px] font-medium text-accent hover:underline"
                      >
                        View history →
                      </Link>
                    </div>
                  )}
                  <Result result={result} />
                </div>
              )}
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Informational guidance only — not medical advice. Always verify with a professional for serious allergies.
        </p>
      </main>
    </div>
  );
}

const verdictStyles: Record<
  ProductVerdict,
  { label: string; bg: string; fg: string; border: string }
> = {
  safe: { label: "Safe for you", bg: "bg-success/15", fg: "text-success", border: "border-success/40" },
  caution: { label: "Use with caution", bg: "bg-warning/15", fg: "text-warning", border: "border-warning/40" },
  avoid: { label: "Avoid", bg: "bg-destructive/15", fg: "text-destructive", border: "border-destructive/40" },
};

function Result({ result }: { result: ProductAnalysis }) {
  const v = verdictStyles[result.verdict];
  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Product
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
          {result.productName}
        </h2>
      </div>

      <div className={`rounded-xl border ${v.border} ${v.bg} p-4`}>
        <div className={`font-mono text-xs uppercase tracking-widest ${v.fg}`}>
          {v.label}
        </div>
        <p className="mt-2 text-sm">{result.summary}</p>
      </div>

      {result.allergyMatches.length > 0 && (
        <Section title="Allergy matches">
          <div className="flex flex-wrap gap-2">
            {result.allergyMatches.map((a) => (
              <span key={a} className="chip border-destructive/50 text-destructive">
                ⚠ {a}
              </span>
            ))}
          </div>
        </Section>
      )}

      {result.flaggedIngredients.length > 0 && (
        <Section title="Flagged ingredients">
          <ul className="space-y-2">
            {result.flaggedIngredients.map((f) => (
              <li key={f.name} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div className="font-medium">{f.name}</div>
                <div className="mt-1 text-muted-foreground">{f.reason}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.alternatives.length > 0 && (
        <Section title="Better alternatives">
          <ul className="space-y-2">
            {result.alternatives.map((a) => (
              <li key={a.name} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                <div className="font-medium text-accent">{a.name}</div>
                <div className="mt-1 text-muted-foreground">{a.why}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.lifestyleTips.length > 0 && (
        <Section title="Lifestyle tips">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {result.lifestyleTips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-accent">→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
