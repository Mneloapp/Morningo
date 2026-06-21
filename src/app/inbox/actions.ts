"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

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
    throw new Error(error.message);
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export async function deleteInboxItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("inbox_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}
