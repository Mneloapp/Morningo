import { Plus, Trash2 } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { requireUser } from "@/lib/auth";
import { type InboxItem } from "@/lib/types";
import { addInboxItem, deleteInboxItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("inbox_items")
    .select("id,user_id,title,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as InboxItem[];

  return (
    <main className="min-h-screen bg-white">
      <BrandHeader />
      <section className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Inbox</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-accent sm:text-5xl">Collect the open loops.</h1>
          </div>
          <div className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600">
            {items.length} {items.length === 1 ? "item" : "items"}
          </div>
        </div>

        <form action={addInboxItem} className="mb-8 flex gap-3 rounded-[28px] border border-neutral-200 bg-white p-3 shadow-soft">
          <Input name="title" placeholder="Add an item..." aria-label="Add an inbox item" required />
          <Button className="h-12 w-12 shrink-0 px-0" aria-label="Add item">
            <Plus size={18} aria-hidden="true" />
          </Button>
        </form>

        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white">
          {items.length ? (
            <ul className="divide-y divide-neutral-200">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-medium text-accent">{item.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      }).format(new Date(item.created_at))}
                    </p>
                  </div>
                  <form action={deleteInboxItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-accent"
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-semibold text-accent">Nothing waiting.</p>
              <p className="mt-2 text-sm text-neutral-500">Add the first thing Morningo should help you sort.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
