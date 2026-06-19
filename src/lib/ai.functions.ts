import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOVABLE_GATEWAY = "https://openrouter.ai/api/v1/chat/completions";
const LOVABLE_MODEL = "openrouter/free";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_GATEWAY = "https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent";
const OPENAI_GATEWAY = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const HUGGINGFACE_GATEWAY = "https://api-inference.huggingface.co/models";
const HUGGINGFACE_TEXT_MODEL = "google/flan-t5-large";

function getHuggingFaceResponseText(json: any) {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (Array.isArray(json)) {
    if (typeof json[0] === "string") return json[0];
    return json[0]?.generated_text ?? json[0]?.text ?? "";
  }
  return json.generated_text ?? json.text ?? "";
}

function buildHuggingFacePrompt(body: any) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  return messages
    .map((message: any) => {
      let content = message.content;
      if (typeof content !== "string") {
        if (Array.isArray(content)) {
          content = content
            .map((item) => {
              if (typeof item === "string") return item;
              if (typeof item?.text === "string") return item.text;
              if (typeof item?.content === "string") return item.content;
              if (item?.type === "image_url") return item.image_url?.url ?? "";
              return JSON.stringify(item);
            })
            .join(" ");
        } else {
          content = JSON.stringify(content);
        }
      }
      return `${message.role.toUpperCase()}: ${content}`;
    })
    .join("\n\n");
}

async function callLovable(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Lovable API key is not configured.");
  const res = await fetch(LOVABLE_GATEWAY, {
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

async function callHuggingFace(body: any) {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("Hugging Face API key is not configured.");
  const prompt = buildHuggingFacePrompt(body);
  const res = await fetch(`${HUGGINGFACE_GATEWAY}/${HUGGINGFACE_TEXT_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 500 } }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited. Try again shortly.");
    console.error("Hugging Face generation error", res.status, text);
    throw new Error(`Hugging Face generation error (${res.status})`);
  }

  const json = await res.json();
  return getHuggingFaceResponseText(json);
}

async function callOpenAI(body: unknown) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API key is not configured.");
  const res = await fetch(OPENAI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: OPENAI_MODEL, ...body }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limited. Try again shortly.");
    console.error("OpenAI gateway error", res.status, text);
    throw new Error(`OpenAI gateway error (${res.status})`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

// Converts an OpenAI-style messages array into Gemini's contents + systemInstruction format.
// Handles text parts and image_url parts (data URLs and http URLs).
function buildGeminiRequest(body: any) {
  const messages: any[] = Array.isArray(body?.messages) ? body.messages : [];

  const systemParts: { text: string }[] = [];
  const contents: { role: string; parts: any[] }[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      systemParts.push({ text });
      continue;
    }

    const parts: any[] = [];
    const contentItems = Array.isArray(msg.content)
      ? msg.content
      : [{ type: "text", text: msg.content }];

    for (const item of contentItems) {
      if (typeof item === "string") {
        parts.push({ text: item });
      } else if (item.type === "text") {
        parts.push({ text: item.text ?? "" });
      } else if (item.type === "image_url") {
        const url: string = item.image_url?.url ?? "";
        if (url.startsWith("data:")) {
          // data:<mime>;base64,<data>
          const [header, base64Data] = url.split(",");
          const mimeType = header.replace("data:", "").replace(";base64", "");
          parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
        } else {
          // Public URL — use file_data (Gemini supports http/https URLs via file_data)
          parts.push({ file_data: { mime_type: "image/jpeg", file_uri: url } });
        }
      }
    }

    // Gemini uses "user" / "model" roles (not "assistant")
    const geminiRole = msg.role === "assistant" ? "model" : "user";
    contents.push({ role: geminiRole, parts });
  }

  const request: any = { contents };
  if (systemParts.length > 0) {
    request.systemInstruction = { parts: systemParts };
  }
  return request;
}

async function callGemini(body: any) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key is not configured.");

  const geminiBody = buildGeminiRequest(body);

  const res = await fetch(`${GEMINI_GATEWAY}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Gemini rate limited. Try again shortly.");
    if (res.status === 403) throw new Error("Gemini API key invalid or quota exceeded.");
    console.error("Gemini gateway error", res.status, text);
    throw new Error(`Gemini gateway error (${res.status})`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGateway(body: unknown) {
  const providers: Array<{ name: string; fn: () => Promise<string> }> = [];

  if (process.env.LOVABLE_API_KEY) {
    providers.push({ name: "Lovable/OpenRouter", fn: () => callLovable(body) });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: "OpenAI", fn: () => callOpenAI(body) });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({ name: "Gemini", fn: () => callGemini(body) });
  }
  if (process.env.HUGGINGFACE_API_KEY) {
    providers.push({ name: "Hugging Face", fn: () => callHuggingFace(body) });
  }

  if (providers.length === 0) {
    throw new Error(
      "AI gateway is not configured. Set LOVABLE_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY in your environment."
    );
  }

  let lastError: Error = new Error("All AI providers failed.");
  for (const provider of providers) {
    try {
      return await provider.fn();
    } catch (err) {
      console.warn(`[AI] ${provider.name} failed, trying next provider...`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError;
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
      model: LOVABLE_MODEL,
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
      model: LOVABLE_MODEL,
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
