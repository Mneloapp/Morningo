import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export async function BrandHeader() {
  const user = hasSupabaseConfig()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
      <Link href="/dashboard" className="flex items-baseline gap-3">
        <span className="text-xl font-semibold tracking-normal text-accent">Morningo</span>
        <span className="hidden text-sm text-neutral-500 sm:inline">The Executive Assistant You Never Hired</span>
      </Link>
      {user ? (
        <nav className="flex items-center gap-1 rounded-full border border-neutral-200 p-1">
          <Link
            href="/dashboard"
            className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/inbox"
            className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-accent"
          >
            Inbox
          </Link>
          <form action={signOut}>
            <button className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80">
              Sign out
            </button>
          </form>
        </nav>
      ) : null}
    </header>
  );
}
