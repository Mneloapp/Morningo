import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export async function requireUser() {
  if (!hasSupabaseConfig()) {
    redirect("/login?error=Supabase%20environment%20variables%20are%20missing%20or%20invalid");
  }

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}
