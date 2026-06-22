import { BrandHeader } from "@/components/brand-header";
import { SetupAlert } from "@/components/setup-alert";
import { requireUser } from "@/lib/auth";
import { getTodayDateString } from "@/lib/dates";
import { type InboxItem } from "@/lib/types";
import { InboxClient } from "./inbox-client";

export const dynamic = "force-dynamic";

const inboxItemSelect =
  "id,user_id,title,scheduled_for,status,priority,category,suggested_next_action,assistant_reason,calendar_starts_at,completed_at,created_at";

export default async function InboxPage() {
  const { supabase, user } = await requireUser();
  const result = await supabase
    .from("inbox_items")
    .select(inboxItemSelect)
    .order("created_at", { ascending: false });
  const fallbackResult = result.error
    ? await supabase.from("inbox_items").select("id,user_id,title,created_at").order("created_at", { ascending: false })
    : null;

  const error = fallbackResult?.error ?? (fallbackResult ? null : result.error);
  const items = ((fallbackResult?.data ?? result.data ?? []) as Partial<InboxItem>[]).map((item) => ({
    assistant_reason: item.assistant_reason ?? null,
    calendar_starts_at: item.calendar_starts_at ?? null,
    category: item.category ?? "general",
    completed_at: item.completed_at ?? null,
    created_at: item.created_at,
    id: item.id,
    priority: item.priority ?? "medium",
    scheduled_for: item.scheduled_for ?? getTodayDateString(),
    status: item.status ?? "planned",
    suggested_next_action: item.suggested_next_action ?? null,
    title: item.title,
    user_id: item.user_id
  })) as InboxItem[];

  return (
    <main className="min-h-screen bg-white">
      <BrandHeader />
      <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
        {error ? (
          <div className="mb-8">
            <SetupAlert
              message={`Supabase returned: ${error.message}. Apply the migration in supabase/migrations before using the inbox.`}
            />
          </div>
        ) : null}

        <InboxClient initialItems={items} userId={user.id} />
      </section>
    </main>
  );
}
