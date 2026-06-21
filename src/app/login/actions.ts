"use server";

import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Email%20and%20password%20are%20required");
  }

  return { email, password };
}

export async function signIn(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=Supabase%20environment%20variables%20are%20missing%20or%20invalid");
  }

  const supabase = await createClient();
  const { email, password } = getCredentials(formData);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=Supabase%20environment%20variables%20are%20missing%20or%20invalid");
  }

  const supabase = await createClient();
  const { email, password } = getCredentials(formData);

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
