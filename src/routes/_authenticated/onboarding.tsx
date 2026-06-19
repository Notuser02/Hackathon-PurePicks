import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { getMyProfile, upsertMyProfile } from "@/lib/profile.functions";
import { loadProfile as loadLocalProfile, saveProfile as saveLocalProfile, emptyProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Setup your profile · PurePicks" },
      {
        name: "description",
        content:
          "Tell PurePicks your allergies, skin & hair type, and the language you want results in.",
      },
    ],
  }),
  component: Onboarding,
});

type Step = 0 | 1 | 2 | 3 | 4;

const SKIN_OPTIONS = ["Normal", "Oily", "Dry", "Combination", "Sensitive"];
const HAIR_OPTIONS = ["Straight", "Wavy", "Curly", "Coily"];
const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Mandarin",
  "Japanese",
  "Korean",
];

type FormState = {
  allergies: string[];
  skinType: string | null;
  hairType: string | null;
  language: string;
};

function Onboarding() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(upsertMyProfile);

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>({
    allergies: [],
    skinType: null,
    hairType: null,
    language: "English",
  });
  const [allergyDraft, setAllergyDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchProfile();
        if (p) {
          setForm({
            allergies: p.allergies ?? [],
            skinType: p.skin_type,
            hairType: p.hair_type,
            language: p.language ?? "English",
          });
          return;
        }
      } catch (e) {
        // ignore server errors and fall back to local profile
      }

      // Fallback: load profile from localStorage so onboarding works without auth
      const local = loadLocalProfile();
      if (local) {
        setForm({
          allergies: local.allergies ?? [],
          skinType: local.skinType,
          hairType: local.hairType,
          language: (local as any).language ?? "English",
        });
      }
    })();
  }, [fetchProfile]);

  const addAllergy = () => {
    const v = allergyDraft.trim();
    if (!v || form.allergies.includes(v)) return;
    setForm((f) => ({ ...f, allergies: [...f.allergies, v].slice(0, 30) }));
    setAllergyDraft("");
  };
  const removeAllergy = (a: string) =>
    setForm((f) => ({ ...f, allergies: f.allergies.filter((x) => x !== a) }));

  const onFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      try {
        await saveProfile({
          data: {
            allergies: form.allergies,
            skin_type: form.skinType,
            skin_notes: null,
            hair_type: form.hairType,
            hair_notes: null,
            language: form.language,
            completed: true,
          },
        });
        navigate({ to: "/scan" });
        return;
      } catch (e) {
        // If server save fails (likely due to missing auth), fall back to localStorage
        saveLocalProfile({
          allergies: form.allergies,
          skinType: form.skinType,
          skinNotes: null,
          hairType: form.hairType,
          hairNotes: null,
          language: form.language,
          completed: true,
          updatedAt: new Date().toISOString(),
        });
        navigate({ to: "/scan" });
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Stepper step={step} />

        {step === 0 && (
          <Panel
            title="What are you allergic or sensitive to?"
            subtitle="Add anything — ingredients, foods, fragrances. Skip if none."
          >
            <div className="flex gap-2">
              <input
                value={allergyDraft}
                onChange={(e) => setAllergyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAllergy();
                  }
                }}
                placeholder="e.g. peanuts, fragrance, sulfates"
                className="flex-1 rounded-xl border border-input bg-secondary/40 px-4 py-3 outline-none focus:border-primary"
              />
              <button
                onClick={addAllergy}
                className="rounded-xl bg-primary px-5 font-medium text-primary-foreground"
              >
                Add
              </button>
            </div>
            {form.allergies.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {form.allergies.map((a) => (
                  <button
                    key={a}
                    onClick={() => removeAllergy(a)}
                    className="chip group hover:border-destructive"
                  >
                    {a}
                    <span className="text-muted-foreground group-hover:text-destructive">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}
            <Footer onBack={null} onNext={() => setStep(1)} nextLabel="Continue" />
          </Panel>
        )}

        {step === 1 && (
          <TypePicker
            title="What is your skin type?"
            subtitle="Pick the option that best describes your skin most of the time."
            options={SKIN_OPTIONS}
            currentValue={form.skinType}
            onSelect={(v) => setForm((f) => ({ ...f, skinType: v }))}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <TypePicker
            title="What is your hair type?"
            subtitle="Pick the option that best describes your natural hair texture."
            options={HAIR_OPTIONS}
            currentValue={form.hairType}
            onSelect={(v) => setForm((f) => ({ ...f, hairType: v }))}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <TypePicker
            title="Which language should we use?"
            subtitle="Your scan results, including translated ingredient names, will appear in this language."
            options={LANGUAGE_OPTIONS}
            currentValue={form.language}
            onSelect={(v) => setForm((f) => ({ ...f, language: v }))}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <Panel
            title="All set!"
            subtitle="PurePicks will use this every time you scan."
          >
            <dl className="space-y-4 text-sm">
              <Row label="Allergies">
                {form.allergies.length ? (
                  <div className="flex flex-wrap gap-2">
                    {form.allergies.map((a) => (
                      <span key={a} className="chip">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </Row>
              <Row label="Skin">
                <div className="font-medium">{form.skinType ?? "—"}</div>
              </Row>
              <Row label="Hair">
                <div className="font-medium">{form.hairType ?? "—"}</div>
              </Row>
              <Row label="Language">
                <div className="font-medium">{form.language}</div>
              </Row>
            </dl>
            {error && (
              <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Footer
              onBack={() => setStep(3)}
              onNext={onFinish}
              nextLabel={saving ? "Saving…" : "Save & start scanning →"}
            />
          </Panel>
        )}
      </main>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Allergies", "Skin", "Hair", "Language", "Review"];
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest">
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          <span
            className={`grid h-6 w-6 place-items-center rounded-md border ${
              i <= step
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === step ? "text-foreground" : "text-muted-foreground"}>
            {l}
          </span>
          {i < labels.length - 1 && <span className="mx-2 h-px w-6 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pop-card p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6 border-b border-border/60 pb-4">
      <dt className="w-24 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}

function Footer({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="mt-10 flex items-center justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="rounded-full px-5 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function TypePicker({
  title,
  subtitle,
  options,
  currentValue,
  onSelect,
  onBack,
  onNext,
}: {
  title: string;
  subtitle: string;
  options: string[];
  currentValue: string | null;
  onSelect: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<"pick" | "other">("pick");
  const [custom, setCustom] = useState("");

  const isOtherSelected = currentValue !== null && !options.includes(currentValue);
  const effectiveValue = isOtherSelected ? currentValue : null;

  const selectOption = (opt: string) => {
    setMode("pick");
    setCustom("");
    onSelect(opt);
  };

  const selectOther = () => {
    setMode("other");
    if (custom.trim()) onSelect(custom.trim());
  };

  const updateCustom = (v: string) => {
    setCustom(v);
    if (mode === "other") onSelect(v.trim());
  };

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => selectOption(opt)}
            className={`rounded-xl border px-4 py-4 text-left font-medium transition ${
              currentValue === opt
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
        <button
          onClick={selectOther}
          className={`rounded-xl border px-4 py-4 text-left font-medium transition ${
            isOtherSelected || mode === "other"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/60 hover:text-foreground"
          }`}
        >
          Other
        </button>
      </div>

      {(mode === "other" || isOtherSelected) && (
        <div className="mt-4">
          <input
            value={mode === "other" ? custom : effectiveValue ?? ""}
            onChange={(e) => updateCustom(e.target.value)}
            placeholder="Type your own"
            className="w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 outline-none focus:border-primary"
          />
        </div>
      )}

      <Footer onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </Panel>
  );
}
