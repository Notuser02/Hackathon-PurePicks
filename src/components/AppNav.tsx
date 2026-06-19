import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";

export function AppNav() {
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
          <NavLink to="/scan">Scan</NavLink>
          <NavLink to="/history">History</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <div className="mx-2 h-5 w-px bg-border" />
          <ThemeToggle />
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
