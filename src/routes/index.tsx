import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PurePicks — Know what's in everything you use" },
      {
        name: "description",
        content:
          "AI-powered ingredient scanner. Tells you if any skin, hair, or food product is safe for your allergies and skin/hair type — instantly.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="blob h-72 w-72 bg-primary/40 -top-10 -left-10" />
          <div className="blob h-80 w-80 bg-accent/40 top-20 -right-16" />
          <div className="blob h-64 w-64 bg-warning/30 bottom-0 left-1/3" />

          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="max-w-3xl">
              <span className="chip">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Your friendly ingredient buddy 🌱
              </span>
              <h1 className="mt-6 font-display text-5xl font-bold leading-[1] tracking-tight md:text-7xl">
                Know what's in
                <br />
                <span className="bg-[var(--gradient-sunny)] bg-clip-text text-transparent">
                  everything you use.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Tell PurePicks your allergies, pick your skin and hair type, then
                scan any product. We read the label and tell you — in plain,
                friendly language — whether it's a happy match for <em>you</em>.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90 glow-ring"
                >
                  Get started →
                </Link>
                <Link
                  to="/scan"
                  className="rounded-full border-2 border-foreground/90 bg-surface px-7 py-3.5 font-semibold text-foreground transition hover:bg-secondary"
                >
                  Scan a product
                </Link>
              </div>

              <dl className="mt-16 grid grid-cols-3 gap-6 max-w-lg">
                {[
                  { k: "12k+", v: "ingredients indexed", c: "bg-primary/15 text-primary" },
                  { k: "3s", v: "avg. scan time", c: "bg-accent/20 text-accent" },
                  { k: "0", v: "data sold, ever", c: "bg-warning/20 text-warning" },
                ].map((s) => (
                  <div
                    key={s.k}
                    className={`rounded-2xl border border-border ${s.c} px-4 py-3`}
                  >
                    <dt className="font-display text-3xl font-bold text-foreground">
                      {s.k}
                    </dt>
                    <dd className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              Three steps. <span className="text-primary">One happy verdict.</span>
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              ~ takes 60 seconds ~
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <article key={s.title} className="pop-card p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl border-2 border-foreground/90 text-2xl ${s.bg}`}
                  >
                    {s.icon}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-bold">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-border/60 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground md:flex-row">
            <p>© PurePicks — informational only, not medical advice. 🌿</p>
            <p className="font-mono">v0.2 · fresh build</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

const STEPS = [
  {
    icon: "🌱",
    bg: "bg-primary/20",
    title: "Tell us about you",
    body: "Add allergies and pick your skin and hair type. PurePicks keeps your profile right on your device.",
  },
  {
    icon: "📷",
    bg: "bg-accent/25",
    title: "Scan any product",
    body: "Point your camera at a label — shampoo, cleanser, snack, anything. We parse the ingredients.",
  },
  {
    icon: "✨",
    bg: "bg-warning/25",
    title: "Get a clear verdict",
    body: "Safe, caution, or skip — with flagged ingredients, friendly alternatives, and lifestyle tips made for you.",
  },
];

