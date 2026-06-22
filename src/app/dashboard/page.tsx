import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/button";
import { SetupAlert } from "@/components/setup-alert";
import { requireUser } from "@/lib/auth";
import { getTodayDateString, getTomorrowDateString } from "@/lib/dates";
import { type InboxItem } from "@/lib/types";
import { generateDailyBrief } from "./actions";

export const dynamic = "force-dynamic";

const inboxItemSelect =
  "id,user_id,title,scheduled_for,status,priority,category,suggested_next_action,assistant_reason,calendar_starts_at,completed_at,created_at";

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</h2>
      {items.length ? (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li key={item} className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium leading-6 text-accent">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-6 text-neutral-500">Nothing urgent here.</p>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const result = await supabase
    .from("inbox_items")
    .select(inboxItemSelect)
    .order("created_at", { ascending: false })
    .limit(25);
  const fallbackResult = result.error
    ? await supabase.from("inbox_items").select("id,user_id,title,created_at").order("created_at", { ascending: false }).limit(25)
    : null;

  const inboxError = fallbackResult?.error ?? (fallbackResult ? null : result.error);
  const setupError = inboxError?.message ?? null;
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  const inboxItems = ((fallbackResult?.data ?? result.data ?? []) as Partial<InboxItem>[]).map((item) => ({
    assistant_reason: item.assistant_reason ?? null,
    calendar_starts_at: item.calendar_starts_at ?? null,
    category: item.category ?? "general",
    completed_at: item.completed_at ?? null,
    created_at: item.created_at,
    id: item.id,
    priority: item.priority ?? "medium",
    scheduled_for: item.scheduled_for ?? today,
    status: item.status ?? "planned",
    suggested_next_action: item.suggested_next_action ?? null,
    title: item.title,
    user_id: item.user_id
  })) as InboxItem[];
  const plannedItems = inboxItems.filter((item) => item.status !== "done");
  const doneItems = inboxItems.filter((item) => item.status === "done");
  const todayItems = plannedItems.filter((item) => item.scheduled_for === today);
  const tomorrowItems = plannedItems.filter((item) => item.scheduled_for === tomorrow);
  const suggestedNextAction = todayItems[0]?.title ?? tomorrowItems[0]?.title;

  return (
    <main className="min-h-screen bg-white">
      <BrandHeader />
      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Dashboard</p>
            <h1 className="mt-3 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-normal text-accent">
              Good morning, {user.email?.split("@")[0] ?? "there"}.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
              Generate a precise daily brief from your inbox and move through the day with fewer decisions.
            </p>
          </div>
          <form action={generateDailyBrief} className="flex justify-start lg:justify-end">
            <Button className="h-12 gap-2 px-6">
              <Sparkles size={18} aria-hidden="true" />
              Generate Daily Brief
            </Button>
          </form>
        </div>

        {setupError ? (
          <div className="mb-8">
            <SetupAlert
              message={`Supabase returned: ${setupError}. Apply the migration in supabase/migrations, then redeploy or refresh.`}
            />
          </div>
        ) : null}

        <div className="mb-8 rounded-[32px] border border-neutral-200 bg-accent p-7 text-white shadow-soft">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/55">Suggested Next Action</p>
              <p className="mt-4 max-w-3xl text-2xl font-semibold leading-9">
                {suggestedNextAction ?? "Generate your first brief to turn loose inbox items into a plan."}
              </p>
            </div>
            <Link
              href="/inbox"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-accent transition hover:bg-neutral-200"
            >
              Open Inbox
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <BriefList title="Focus Today" items={todayItems.slice(0, 5).map((item) => item.title)} />
          <BriefList title="Can Wait" items={tomorrowItems.slice(0, 5).map((item) => item.title)} />
          <BriefList title="Completed" items={doneItems.slice(0, 5).map((item) => item.title)} />
        </div>
      </section>
    </main>
  );
}
