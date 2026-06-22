import { NextResponse } from "next/server";
import { getTodayDateString, getTomorrowDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { type InboxItem } from "@/lib/types";

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

function normalizeScheduledFor(value: string | undefined) {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  return value === tomorrow ? tomorrow : today;
}

async function insertInboxItem(title: string, scheduledFor: string, userId: string) {
  const { error, supabase } = await getAuthenticatedSupabase();

  if (error) {
    return error;
  }

  const payload = {
    scheduled_for: scheduledFor,
    title,
    user_id: userId
  };

  const { data, error: insertError } = await supabase
    .from("inbox_items")
    .insert(payload)
    .select("id,user_id,title,scheduled_for,created_at")
    .single();

  if (!insertError && data) {
    return NextResponse.json({ item: data as InboxItem });
  }

  if (insertError?.message.includes("scheduled_for")) {
    const { data: retryData, error: retryError } = await supabase
      .from("inbox_items")
      .insert({
        title,
        user_id: userId
      })
      .select("id,user_id,title,created_at")
      .single();

    if (retryError?.message.includes('null value in column "content"')) {
      const { data: contentRetryData, error: contentRetryError } = await supabase
        .from("inbox_items")
        .insert({
          content: title,
          title,
          user_id: userId
        })
        .select("id,user_id,title,created_at")
        .single();

      if (contentRetryError || !contentRetryData) {
        return NextResponse.json({ error: contentRetryError?.message ?? "Could not save item." }, { status: 400 });
      }

      return NextResponse.json({ item: { ...contentRetryData, scheduled_for: scheduledFor } as InboxItem });
    }

    if (retryError || !retryData) {
      return NextResponse.json({ error: retryError?.message ?? "Could not save item." }, { status: 400 });
    }

    return NextResponse.json({ item: { ...retryData, scheduled_for: scheduledFor } as InboxItem });
  }

  if (!insertError?.message.includes('null value in column "content"')) {
    return NextResponse.json({ error: insertError?.message ?? "Could not save item." }, { status: 400 });
  }

  const { data: retryData, error: retryError } = await supabase
    .from("inbox_items")
    .insert({
      ...payload,
      content: title
    })
    .select("id,user_id,title,scheduled_for,created_at")
    .single();

  if (retryError || !retryData) {
    return NextResponse.json({ error: retryError?.message ?? "Could not save item." }, { status: 400 });
  }

  return NextResponse.json({ item: retryData as InboxItem });
}

export async function POST(request: Request) {
  const { error, user } = await getAuthenticatedSupabase();

  if (error) {
    return error;
  }

  const body = (await request.json().catch(() => null)) as { scheduled_for?: string; title?: string } | null;
  const title = body?.title?.trim();
  const scheduledFor = normalizeScheduledFor(body?.scheduled_for);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  return insertInboxItem(title, scheduledFor, user.id);
}

export async function DELETE(request: Request) {
  const { error, supabase, user } = await getAuthenticatedSupabase();

  if (error) {
    return error;
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id;

  if (!id) {
    return NextResponse.json({ error: "Item id is required." }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from("inbox_items").delete().eq("id", id).eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { error, supabase, user } = await getAuthenticatedSupabase();

  if (error) {
    return error;
  }

  const body = (await request.json().catch(() => null)) as { id?: string; scheduled_for?: string } | null;
  const id = body?.id;
  const scheduledFor = normalizeScheduledFor(body?.scheduled_for);

  if (!id) {
    return NextResponse.json({ error: "Item id is required." }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("inbox_items")
    .update({ scheduled_for: scheduledFor })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,user_id,title,scheduled_for,created_at")
    .single();

  if (updateError || !data) {
    return NextResponse.json({ error: updateError?.message ?? "Could not move item." }, { status: 400 });
  }

  return NextResponse.json({ item: data as InboxItem });
}
