import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

export function AppNav() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-sunny)] font-display text-lg border-2 border-foreground/90 shadow-[3px_3px_0_0_var(--foreground)]">
            🌿
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            PurePicks
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {signedIn ? (
            <>
              <NavLink to="/scan">Scan</NavLink>
              <NavLink to="/history">History</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              <div className="mx-2 h-5 w-px bg-border" />
              <ThemeToggle />
              <button
                onClick={signOut}
                className="ml-2 rounded-full border border-border px-4 py-1.5 text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                to="/auth"
                className="ml-2 rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground hover:opacity-90"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "text-foreground bg-secondary" }}
    >
      {children}
    </Link>
  );
}
