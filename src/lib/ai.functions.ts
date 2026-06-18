import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callGateway(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI gateway is not configured.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited. Try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in your workspace.");
    console.error("AI gateway error", res.status, text);
    throw new Error(`AI gateway error (${res.status})`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(text: string): T {
  // Strip ```json fences if model added them
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

/* ---------------- Photo Analysis (skin / hair) ---------------- */

const photoSchema = z.object({
  imageDataUrl: z
    .string()
    .max(8_000_000, "Image too large")
    .refine((s) => s.startsWith("data:image/"), "Must be a data URL"),
  kind: z.enum(["skin", "hair"]),
});

export type PhotoAnalysis = {
  type: string;
  notes: string;
  concerns: string[];
};

export const analyzePhoto = createServerFn({ method: "POST" })
  .inputValidator(photoSchema)
  .handler(async ({ data }): Promise<PhotoAnalysis> => {
    const subject = data.kind === "skin" ? "skin" : "hair and scalp";
    const taxonomy =
      data.kind === "skin"
        ? "Use one of: Oily, Dry, Combination, Normal, Sensitive. Optionally add a sub-descriptor (e.g. 'Combination — oily T-zone')."
        : "Use one of: Straight, Wavy, Curly, Coily. Add density (fine/medium/thick) and any visible condition (dry, oily roots, frizz, breakage).";

    const system = `You are a dermatology and trichology visual assistant. You are not a doctor — your output is informational guidance, not diagnosis. Analyze the user's ${subject} from the photo. Return STRICT JSON only, no prose, no markdown fences.`;

    const user = `Analyze this ${subject} photo.
${taxonomy}
Respond with JSON of shape:
{
  "type": "short type label",
  "notes": "1-2 sentence observation",
  "concerns": ["short", "tags", "if any"]
}`;

    const content = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });

    try {
      return parseJson<PhotoAnalysis>(content);
    } catch {
      return {
        type: "Unable to determine",
        notes:
          "We couldn't confidently read the photo. Try better lighting and a closer shot.",
        concerns: [],
      };
    }
  });

/* ---------------- Product Scan ---------------- */

const productSchema = z.object({
  imageDataUrl: z
    .string()
    .max(8_000_000)
    .refine((s) => s.startsWith("data:image/"), "Must be a data URL"),
  category: z.enum(["skin", "hair", "food"]),
  allergies: z.array(z.string().max(80)).max(50),
  skinType: z.string().max(120).nullable(),
  hairType: z.string().max(120).nullable(),
  language: z.string().min(1).max(60).default("English"),
});

export type ProductVerdict = "safe" | "caution" | "avoid";

export type ProductAnalysis = {
  productName: string;
  verdict: ProductVerdict;
  summary: string;
  flaggedIngredients: { name: string; reason: string }[];
  allergyMatches: string[];
  alternatives: { name: string; why: string }[];
  lifestyleTips: string[];
};

export const analyzeProduct = createServerFn({ method: "POST" })
  .inputValidator(productSchema)
  .handler(async ({ data }): Promise<ProductAnalysis> => {
    const profileBlock = `User profile:
- Allergies / sensitivities: ${data.allergies.length ? data.allergies.join(", ") : "none reported"}
- Skin type: ${data.skinType ?? "unknown"}
- Hair type: ${data.hairType ?? "unknown"}
- Product category: ${data.category}
- Preferred output language: ${data.language}`;

    const system = `You are an ingredient-safety assistant for skin care, hair care, and food products. You are not a medical professional — outputs are informational, not medical advice. Read the product label/packaging in the image, identify the product, parse the ingredient list (which may be in ANY language), and assess it for this specific user.

CRITICAL: Write ALL human-readable output fields (productName, summary, flaggedIngredients[].name, flaggedIngredients[].reason, allergyMatches, alternatives[].name, alternatives[].why, lifestyleTips) in ${data.language}. Translate ingredient names from the label into ${data.language}. If a chemical/INCI name has no common translation, keep the original and append a short ${data.language} description in parentheses.

Verdict scale:
- "safe": no significant concerns for this user
- "caution": contains common irritants, mild allergy risk, or suboptimal for their type
- "avoid": directly contains a listed allergen or a strongly harmful ingredient for them

Return STRICT JSON only, no markdown fences, no prose.`;

    const user = `${profileBlock}

Analyze the product shown. Respond with JSON (all text in ${data.language}):
{
  "productName": "best guess of product name",
  "verdict": "safe" | "caution" | "avoid",
  "summary": "1-2 sentence plain-language verdict for the user",
  "flaggedIngredients": [{ "name": "ingredient", "reason": "why it's flagged for them" }],
  "allergyMatches": ["allergen from their list that appears in product"],
  "alternatives": [{ "name": "better alternative product or ingredient", "why": "why it suits them" }],
  "lifestyleTips": ["short actionable tip", "..."]
}

If the image is not a product label, set verdict to "caution", productName to "Unrecognized product", and explain in summary (in ${data.language}).`;

    const content = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });

    try {
      return parseJson<ProductAnalysis>(content);
    } catch {
      return {
        productName: "Unrecognized product",
        verdict: "caution",
        summary:
          "We couldn't parse a clear analysis. Try a clearer photo of the ingredient label.",
        flaggedIngredients: [],
        allergyMatches: [],
        alternatives: [],
        lifestyleTips: [],
      };
    }
  });
