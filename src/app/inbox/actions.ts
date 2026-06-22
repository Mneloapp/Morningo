"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

function inboxErrorUrl(message: string) {
  return `/inbox?error=${encodeURIComponent(message)}`;
}

export async function addInboxItem(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("inbox_items").insert({
    title,
    user_id: user.id
  });

  if (error) {
    redirect(inboxErrorUrl(error.message));
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect("/inbox");
}

export async function deleteInboxItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("inbox_items").delete().eq("id", id);

  if (error) {
    redirect(inboxErrorUrl(error.message));
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  redirect("/inbox");
}
