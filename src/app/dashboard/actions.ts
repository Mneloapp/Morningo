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

const inboxItemSelect =
  "id,user_id,title,scheduled_for,status,priority,category,suggested_next_action,assistant_reason,calendar_starts_at,reminder_at,confirmed_at,completed_at,created_at";

function fallbackBrief(items: InboxItem[]) {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const plannedItems = items.filter((item) => item.status !== "done");
  const todayTitles = plannedItems.filter((item) => item.scheduled_for === today).map((item) => item.title);
  const tomorrowTitles = plannedItems.filter((item) => item.scheduled_for === tomorrow).map((item) => item.title);
  const highPriorityTitles = plannedItems.filter((item) => item.priority === "high").map((item) => item.title);
  const overdueTitles = plannedItems
    .filter((item) => item.reminder_at && new Date(item.reminder_at).getTime() <= Date.now() && item.status !== "done")
    .map((item) => item.title);

  return {
    focus_today: todayTitles.slice(0, 5).length ? todayTitles.slice(0, 5) : ["Choose one meaningful outcome for today"],
    can_wait: tomorrowTitles.slice(0, 5),
    risks: overdueTitles.length
      ? overdueTitles.slice(0, 3)
      : highPriorityTitles.length
        ? highPriorityTitles.slice(0, 3)
        : todayTitles.length > 5
          ? ["Today has more than five open loops; reduce scope before adding more"]
          : [],
    suggested_next_action: todayTitles[0] ?? tomorrowTitles[0] ?? "Add the first inbox item you want Morningo to prioritize"
  };
}

export async function generateDailyBrief() {
  const { supabase, user } = await requireUser();
  const result = await supabase
    .from("inbox_items")
    .select(inboxItemSelect)
    .order("created_at", { ascending: false })
    .limit(25);
  const fallbackResult = result.error
    ? await supabase.from("inbox_items").select("id,user_id,title,created_at").order("created_at", { ascending: false }).limit(25)
    : null;
  const error = fallbackResult?.error ?? (fallbackResult ? null : result.error);

  if (error) {
    throw new Error(error.message);
  }

  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const items = ((fallbackResult?.data ?? result.data ?? []) as Partial<InboxItem>[]).map((item) => ({
    assistant_reason: item.assistant_reason ?? null,
    calendar_starts_at: item.calendar_starts_at ?? null,
    category: item.category ?? "general",
    confirmed_at: item.confirmed_at ?? null,
    completed_at: item.completed_at ?? null,
    created_at: item.created_at,
    id: item.id,
    priority: item.priority ?? "medium",
    scheduled_for: item.scheduled_for ?? today,
    status: item.status ?? "planned",
    reminder_at: item.reminder_at ?? null,
    suggested_next_action: item.suggested_next_action ?? null,
    title: item.title,
    user_id: item.user_id
  })) as InboxItem[];
  let brief = fallbackBrief(items);
  const plannedItems = items.filter((item) => item.status !== "done");
  const doneItems = items.filter((item) => item.status === "done");
  const todayItems = plannedItems.filter((item) => item.scheduled_for === today);
  const tomorrowItems = plannedItems.filter((item) => item.scheduled_for === tomorrow);

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
            today_items: todayItems.map((item) => ({
              category: item.category,
              priority: item.priority,
              reason: item.assistant_reason,
              reminder_at: item.reminder_at,
              status: item.status,
              title: item.title
            })),
            tomorrow,
            tomorrow_items: tomorrowItems.map((item) => ({
              category: item.category,
              priority: item.priority,
              reason: item.assistant_reason,
              reminder_at: item.reminder_at,
              status: item.status,
              title: item.title
            })),
            completed_items: doneItems.map((item) => item.title)
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
