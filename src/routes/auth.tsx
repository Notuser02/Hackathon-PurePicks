import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · PurePicks" },
      {
        name: "description",
        content:
          "Sign in or create a PurePicks account to save your ingredient profile and scan history.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

const PERKS = [
  { icon: "🌱", title: "Personal profile", desc: "Your allergies, skin & hair type, in your language." },
  { icon: "🔍", title: "Smarter scans", desc: "Every ingredient translated and decoded for you." },
  { icon: "📚", title: "Scan history", desc: "Pick up where you left off, on any device." },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/onboarding" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/onboarding" },
        });
        if (error) throw error;
        setInfo("Almost there! Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/onboarding" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/onboarding",
    });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding" });
  };

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen overflow-hidden grid-bg">
      {/* ambient blobs */}
      <div className="blob h-[420px] w-[420px] bg-primary/40 -top-32 -left-24" />
      <div className="blob h-[460px] w-[460px] bg-accent/40 -bottom-40 -right-24" />
      <div className="blob h-[320px] w-[320px] bg-[oklch(0.82_0.13_320)]/40 top-1/3 left-1/2" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 lg:py-10">
        {/* top bar */}
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-sunny)] text-lg border-2 border-foreground/90 shadow-[3px_3px_0_0_var(--foreground)]">
            🌿
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            PurePicks
          </span>
        </Link>

        <div className="mt-8 grid flex-1 items-center gap-10 lg:mt-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Left: marketing panel */}
          <div className="hidden lg:block">
            <span className="chip">
              <span className="h-2 w-2 rounded-full bg-success" />
              Clean beauty, decoded
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight">
              Know what's on
              <br />
              your skin.{" "}
              <span className="bg-[var(--gradient-violet)] bg-clip-text text-transparent">
                In your language.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              Sign in to save your allergies, skin & hair profile, and get every
              ingredient translated and personalized to you.
            </p>

            <div className="mt-8 space-y-3">
              {PERKS.map((p) => (
                <div
                  key={p.title}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-lg">
                    {p.icon}
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: auth card */}
          <div className="mx-auto w-full max-w-md">
            <div className="pop-card p-7 sm:p-8">
              {/* mode toggle */}
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary/60 p-1 text-sm font-medium">
                {(["signin", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                      setInfo(null);
                    }}
                    className={`rounded-full px-4 py-2 transition ${
                      mode === m
                        ? "bg-foreground text-background shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {isSignup ? "Join PurePicks" : "Welcome back"}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isSignup
                  ? "Free to start — no card needed."
                  : "Sign in to access your profile and history."}
              </p>

              <button
                onClick={google}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-foreground/90 bg-surface px-4 py-3 font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or with email
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignup ? "Create a password (6+ chars)" : "Your password"}
                    className="w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                {error && (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success-foreground">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground/90 bg-primary py-3 font-semibold text-primary-foreground shadow-[4px_4px_0_0_var(--foreground)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--foreground)] disabled:opacity-60"
                >
                  {busy ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isSignup ? (
                    "Create account →"
                  ) : (
                    "Sign in →"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <span className="underline underline-offset-2">Terms</span> and{" "}
                <span className="underline underline-offset-2">Privacy Policy</span>.
              </p>
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground lg:hidden">
              {isSignup ? "Already have an account?" : "New to PurePicks?"}{" "}
              <button
                type="button"
                onClick={() => setMode(isSignup ? "signin" : "signup")}
                className="font-medium text-foreground hover:underline"
              >
                {isSignup ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.45-1.7 4.25-5.5 4.25-3.31 0-6.01-2.74-6.01-6.12s2.7-6.12 6.01-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.78 3.6 14.62 2.7 12 2.7 6.86 2.7 2.7 6.86 2.7 12s4.16 9.3 9.3 9.3c5.37 0 8.93-3.77 8.93-9.08 0-.61-.07-1.08-.15-1.55H12z"
      />
    </svg>
  );
}
