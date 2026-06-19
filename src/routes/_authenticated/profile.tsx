import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { getMyProfile, type ProfileRow } from "@/lib/profile.functions";
import { loadProfile as loadLocalProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile · PurePicks" },
      {
        name: "description",
        content:
          "Your saved allergies, skin and hair type, and preferred language for ingredient scans.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const fetchProfile = useServerFn(getMyProfile);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        if (p) {
          setProfile(p);
          setLoaded(true);
          return;
        }
      } catch (e) {
        // ignore and fall back to local
      }

      // Fallback: load from localStorage
      const local = loadLocalProfile();
      if (local) {
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
      }
      setLoaded(true);
    })();
  }, [fetchProfile]);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your profile is saved locally on your device.
        </p>

        {!loaded && (
          <div className="mt-10 pop-card p-8 text-center text-muted-foreground">
            Loading…
          </div>
        )}

        {loaded && profile && (
          <div className="mt-10 space-y-4">
            <Card label="Allergies & sensitivities">
              {profile.allergies?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.allergies.map((a) => (
                    <span key={a} className="chip">
                      {a}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None reported</p>
              )}
            </Card>

            <Card label="Skin">
              <div className="font-display text-2xl font-bold">
                {profile.skin_type ?? "—"}
              </div>
            </Card>

            <Card label="Hair">
              <div className="font-display text-2xl font-bold">
                {profile.hair_type ?? "—"}
              </div>
            </Card>

            <Card label="Language">
              <div className="font-display text-2xl font-bold">
                {profile.language}
              </div>
            </Card>

            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                to="/onboarding"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Update profile
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="pop-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
