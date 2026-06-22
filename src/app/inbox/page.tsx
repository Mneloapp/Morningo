import { BrandHeader } from "@/components/brand-header";
import { SetupAlert } from "@/components/setup-alert";
import { requireUser } from "@/lib/auth";
import { getTodayDateString } from "@/lib/dates";
import { type InboxItem } from "@/lib/types";
import { InboxClient } from "./inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { supabase, user } = await requireUser();
  const result = await supabase
    .from("inbox_items")
    .select("id,user_id,title,scheduled_for,created_at")
    .order("created_at", { ascending: false });
  const fallbackResult = result.error?.message.includes("scheduled_for")
    ? await supabase.from("inbox_items").select("id,user_id,title,created_at").order("created_at", { ascending: false })
    : null;

  const error = fallbackResult?.error ?? (fallbackResult ? null : result.error);
  const items = ((fallbackResult?.data ?? result.data ?? []) as Omit<InboxItem, "scheduled_for">[]).map((item) => ({
    ...item,
    scheduled_for: "scheduled_for" in item ? item.scheduled_for : getTodayDateString()
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
