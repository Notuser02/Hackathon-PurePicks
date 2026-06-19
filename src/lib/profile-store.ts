export type Profile = {
  allergies: string[];
  skinType: string | null;
  skinNotes: string | null;
  hairType: string | null;
  hairNotes: string | null;
  language?: string | null;
  completed?: boolean;
  updatedAt: string;
};

const KEY = "purepicks.profile.v1";

export const emptyProfile = (): Profile => ({
  allergies: [],
  skinType: null,
  skinNotes: null,
  hairType: null,
  hairNotes: null,
  language: "English",
  completed: false,
  updatedAt: new Date().toISOString(),
});

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...p, updatedAt: new Date().toISOString() }),
  );
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
