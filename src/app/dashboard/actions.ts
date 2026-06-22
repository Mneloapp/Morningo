"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getTodayDateString, getTomorrowDateString } from "@/lib/dates";
import { type InboxItem } from "@/lib/types";

const briefSchema = z.object({
  focus_today: z.array(z.string()).min(1).max(5),
  can_wait: z.array(z.string()).max(5),
  risks: z.array(z.string()).max(5),
  suggested_next_action: z.string().min(1)
});

function fallbackBrief(items: InboxItem[]) {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const todayTitles = items.filter((item) => item.scheduled_for === today).map((item) => item.title);
  const tomorrowTitles = items.filter((item) => item.scheduled_for === tomorrow).map((item) => item.title);

  return {
    focus_today: todayTitles.slice(0, 5).length ? todayTitles.slice(0, 5) : ["Choose one meaningful outcome for today"],
    can_wait: tomorrowTitles.slice(0, 5),
    risks: todayTitles.length > 5 ? ["Today has more than five open loops; reduce scope before adding more"] : [],
    suggested_next_action: todayTitles[0] ?? tomorrowTitles[0] ?? "Add the first inbox item you want Morningo to prioritize"
  };
}

export async function generateDailyBrief() {
  const { supabase, user } = await requireUser();
  const result = await supabase
    .from("inbox_items")
    .select("id,user_id,title,scheduled_for,created_at")
    .order("created_at", { ascending: false })
    .limit(25);
  const fallbackResult = result.error?.message.includes("scheduled_for")
    ? await supabase.from("inbox_items").select("id,user_id,title,created_at").order("created_at", { ascending: false }).limit(25)
    : null;
  const error = fallbackResult?.error ?? (fallbackResult ? null : result.error);

  if (error) {
    throw new Error(error.message);
  }

  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const items = ((fallbackResult?.data ?? result.data ?? []) as Omit<InboxItem, "scheduled_for">[]).map((item) => ({
    ...item,
    scheduled_for: "scheduled_for" in item ? item.scheduled_for : today
  })) as InboxItem[];
  let brief = fallbackBrief(items);
  const todayItems = items.filter((item) => item.scheduled_for === today);
  const tomorrowItems = items.filter((item) => item.scheduled_for === tomorrow);

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
            today,
            today_items: todayItems.map((item) => item.title),
            tomorrow,
            tomorrow_items: tomorrowItems.map((item) => item.title)
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
    console.error("Daily brief could not be stored:", insertError.message);
  }

  revalidatePath("/dashboard");
}
