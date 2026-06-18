import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfileRow = {
  user_id: string;
  allergies: string[];
  skin_type: string | null;
  skin_notes: string | null;
  hair_type: string | null;
  hair_notes: string | null;
  language: string;
  completed: boolean;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileRow | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ProfileRow | null) ?? null;
  });

const upsertSchema = z.object({
  allergies: z.array(z.string().min(1).max(80)).max(50),
  skin_type: z.string().min(1).max(120).nullable(),
  skin_notes: z.string().max(500).nullable(),
  hair_type: z.string().min(1).max(120).nullable(),
  hair_notes: z.string().max(500).nullable(),
  language: z.string().min(1).max(60),
  completed: z.boolean(),
});

export const upsertMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(upsertSchema)
  .handler(async ({ data, context }): Promise<ProfileRow> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as ProfileRow;
  });
