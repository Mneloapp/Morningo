import { BrandHeader } from "@/components/brand-header";
import { SetupAlert } from "@/components/setup-alert";
import { requireUser } from "@/lib/auth";
import { type InboxItem } from "@/lib/types";
import { InboxClient } from "./inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("inbox_items")
    .select("id,user_id,title,created_at")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as InboxItem[];

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
