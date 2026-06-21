"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { type InboxItem } from "@/lib/types";

const briefSchema = z.object({
  focus_today: z.array(z.string()).min(1).max(5),
  can_wait: z.array(z.string()).max(5),
  risks: z.array(z.string()).max(5),
  suggested_next_action: z.string().min(1)
});

function fallbackBrief(items: InboxItem[]) {
  const titles = items.map((item) => item.title);

  return {
    focus_today: titles.slice(0, 3).length ? titles.slice(0, 3) : ["Choose one meaningful outcome for today"],
    can_wait: titles.slice(3, 6),
    risks: titles.length > 6 ? ["Inbox volume is growing; review stale items before adding more"] : [],
    suggested_next_action: titles[0] ?? "Add the first inbox item you want Morningo to prioritize"
  };
}

export async function generateDailyBrief() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("inbox_items")
    .select("id,user_id,title,created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as InboxItem[];
  let brief = fallbackBrief(items);

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Morningo, a concise executive assistant. Return only valid JSON with keys focus_today, can_wait, risks, suggested_next_action. Keep every item short, concrete, and executive-grade."
        },
        {
          role: "user",
          content: JSON.stringify({
            inbox_items: items.map((item) => item.title),
            today: new Date().toISOString().slice(0, 10)
          })
        }
      ]
    });

    const content = response.choices[0]?.message?.content;

    if (content) {
      try {
        const parsed = briefSchema.safeParse(JSON.parse(content));

        if (parsed.success) {
          brief = parsed.data;
        }
      } catch {
        brief = fallbackBrief(items);
      }
    }
  }

  const { error: insertError } = await supabase.from("daily_briefs").insert({
    user_id: user.id,
    focus_today: brief.focus_today,
    can_wait: brief.can_wait,
    risks: brief.risks,
    suggested_next_action: brief.suggested_next_action
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/dashboard");
}
