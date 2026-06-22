"use client";

import { type DragEvent, type FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { SetupAlert } from "@/components/setup-alert";
import { getTodayDateString, getTomorrowDateString } from "@/lib/dates";
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

async function insertInboxItem(title: string, scheduledFor: string) {
  const response = await fetch("/api/inbox-items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ scheduled_for: scheduledFor, title })
  });
  const payload = (await response.json()) as { item?: InboxItem; error?: string };

  if (!response.ok || !payload.item) {
    throw new Error(payload.error ?? "Could not save item.");
  }

  return payload.item;
}

async function moveInboxItem(id: string, scheduledFor: string) {
  const response = await fetch("/api/inbox-items", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id, scheduled_for: scheduledFor })
  });
  const payload = (await response.json()) as { item?: InboxItem; error?: string };

  if (!response.ok || !payload.item) {
    throw new Error(payload.error ?? "Could not move item.");
  }

  return payload.item;
}

export function InboxClient({ initialItems, userId }: InboxClientProps) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState(getTodayDateString());
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const todayItems = items.filter((item) => item.scheduled_for === today);
  const tomorrowItems = items.filter((item) => item.scheduled_for === tomorrow);

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
      scheduled_for: scheduledFor,
      created_at: new Date().toISOString()
    };

    setError(null);
    setTitle("");
    setIsAdding(true);
    setItems((currentItems) => [optimisticItem, ...currentItems]);

    try {
      const savedItem = await insertInboxItem(nextTitle, scheduledFor);
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

  function handleDragStart(event: DragEvent<HTMLLIElement>, item: InboxItem) {
    setDraggedItemId(item.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
  }

  function handleDragEnd() {
    setDraggedItemId(null);
    setDragTarget(null);
  }

  async function handleDrop(event: DragEvent<HTMLElement>, nextScheduledFor: string) {
    event.preventDefault();

    const itemId = event.dataTransfer.getData("text/plain") || draggedItemId;
    const itemToMove = items.find((item) => item.id === itemId);

    setDragTarget(null);

    if (!itemToMove || itemToMove.scheduled_for === nextScheduledFor || itemToMove.id.startsWith("optimistic-")) {
      return;
    }

    const previousItems = items;

    setError(null);
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === itemToMove.id ? { ...item, scheduled_for: nextScheduledFor } : item))
    );

    try {
      const movedItem = await moveInboxItem(itemToMove.id, nextScheduledFor);
      setItems((currentItems) => currentItems.map((item) => (item.id === movedItem.id ? movedItem : item)));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not move item.";
      setItems(previousItems);
      setError(message);
    } finally {
      setDraggedItemId(null);
    }
  }

  function renderItems(sectionItems: InboxItem[], emptyMessage: string) {
    if (!sectionItems.length) {
      return (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-medium text-neutral-500">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <ul className="divide-y divide-neutral-200">
        {sectionItems.map((item) => (
          <li
            key={item.id}
            draggable={!item.id.startsWith("optimistic-")}
            onDragEnd={handleDragEnd}
            onDragStart={(event) => handleDragStart(event, item)}
            className={`flex cursor-grab items-center justify-between gap-4 px-5 py-4 transition active:cursor-grabbing ${
              draggedItemId === item.id ? "bg-neutral-50 opacity-60" : "bg-white"
            }`}
          >
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
    );
  }

  async function handleDelete(itemToDelete: InboxItem) {
    const previousItems = items;

    setError(null);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemToDelete.id));

    const response = await fetch("/api/inbox-items", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: itemToDelete.id })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setItems(previousItems);
      setError(payload.error ?? "Could not delete item.");
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

      <form onSubmit={handleAdd} className="mb-8 grid gap-3 rounded-[28px] border border-neutral-200 bg-white p-3 shadow-soft sm:grid-cols-[1fr_auto_auto]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          name="title"
          placeholder="Add an item..."
          aria-label="Add an inbox item"
          required
        />
        <div className="grid grid-cols-2 rounded-full bg-neutral-100 p-1">
          {[
            { label: "Today", value: today },
            { label: "Tomorrow", value: tomorrow }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScheduledFor(option.value)}
              className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                scheduledFor === option.value ? "bg-white text-accent shadow-sm" : "text-neutral-500 hover:text-accent"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button type="submit" className="h-12 w-12 shrink-0 px-0" aria-label="Add item" disabled={isAdding}>
          <Plus size={18} aria-hidden="true" />
        </Button>
      </form>

      {error ? (
        <div className="mb-8">
          <SetupAlert title="Could not save item" message={error} />
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section
          onDragEnter={() => setDragTarget(today)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragTarget(null)}
          onDrop={(event) => handleDrop(event, today)}
          className={`min-h-[260px] overflow-hidden rounded-[28px] border bg-white transition ${
            dragTarget === today ? "border-accent shadow-soft" : "border-neutral-200"
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Today</h2>
            <span className="text-sm font-medium text-neutral-500">{todayItems.length}</span>
          </div>
          {renderItems(todayItems, "Nothing scheduled for today.")}
        </section>

        <section
          onDragEnter={() => setDragTarget(tomorrow)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragTarget(null)}
          onDrop={(event) => handleDrop(event, tomorrow)}
          className={`min-h-[260px] overflow-hidden rounded-[28px] border bg-white transition ${
            dragTarget === tomorrow ? "border-accent shadow-soft" : "border-neutral-200"
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Tomorrow</h2>
            <span className="text-sm font-medium text-neutral-500">{tomorrowItems.length}</span>
          </div>
          {renderItems(tomorrowItems, "Nothing scheduled for tomorrow.")}
        </section>
      </div>
    </>
  );
}
