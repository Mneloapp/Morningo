"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { SetupAlert } from "@/components/setup-alert";
import { createClient } from "@/lib/supabase/client";
import { type InboxItem } from "@/lib/types";

type InboxClientProps = {
  initialItems: InboxItem[];
  userId: string;
};

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

async function insertInboxItem(title: string, userId: string) {
  const supabase = createClient();
  const payload = {
    title,
    user_id: userId
  };

  const { data, error } = await supabase
    .from("inbox_items")
    .insert(payload)
    .select("id,user_id,title,created_at")
    .single();

  if (!error) {
    if (!data) {
      throw new Error("Supabase saved the item but did not return it.");
    }

    return data as InboxItem;
  }

  if (!error.message.includes('null value in column "content"')) {
    throw new Error(error.message);
  }

  const { data: retryData, error: retryError } = await supabase
    .from("inbox_items")
    .insert({
      ...payload,
      content: title
    })
    .select("id,user_id,title,created_at")
    .single();

  if (retryError) {
    throw new Error(retryError.message);
  }

  if (!retryData) {
    throw new Error("Supabase saved the item but did not return it.");
  }

  return retryData as InboxItem;
}

export function InboxClient({ initialItems, userId }: InboxClientProps) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();

    if (!nextTitle || isAdding) {
      return;
    }

    const optimisticItem: InboxItem = {
      id: `optimistic-${Date.now()}`,
      user_id: userId,
      title: nextTitle,
      created_at: new Date().toISOString()
    };

    setError(null);
    setTitle("");
    setIsAdding(true);
    setItems((currentItems) => [optimisticItem, ...currentItems]);

    try {
      const savedItem = await insertInboxItem(nextTitle, userId);
      setItems((currentItems) => currentItems.map((item) => (item.id === optimisticItem.id ? savedItem : item)));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not save item.";
      setError(message);
      setItems((currentItems) => currentItems.filter((item) => item.id !== optimisticItem.id));
      setTitle(nextTitle);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(itemToDelete: InboxItem) {
    const previousItems = items;

    setError(null);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemToDelete.id));

    const { error: deleteError } = await supabase.from("inbox_items").delete().eq("id", itemToDelete.id);

    if (deleteError) {
      setItems(previousItems);
      setError(deleteError.message);
    }
  }

  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Inbox</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-accent sm:text-5xl">Collect the open loops.</h1>
        </div>
        <div className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600">
          {items.length} {items.length === 1 ? "item" : "items"}
        </div>
      </div>

      <form onSubmit={handleAdd} className="mb-8 flex gap-3 rounded-[28px] border border-neutral-200 bg-white p-3 shadow-soft">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          name="title"
          placeholder="Add an item..."
          aria-label="Add an inbox item"
          required
        />
        <Button type="submit" className="h-12 w-12 shrink-0 px-0" aria-label="Add item" disabled={isAdding}>
          <Plus size={18} aria-hidden="true" />
        </Button>
      </form>

      {error ? (
        <div className="mb-8">
          <SetupAlert title="Could not save item" message={error} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white">
        {items.length ? (
          <ul className="divide-y divide-neutral-200">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium text-accent">{item.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatCreatedAt(item.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-accent"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
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
    </>
  );
}
