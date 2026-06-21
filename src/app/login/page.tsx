import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { createClient } from "@/lib/supabase/server";
import { signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-white">
      <BrandHeader />
      <section className="mx-auto grid min-h-[calc(100vh-96px)] w-full max-w-6xl items-center gap-12 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Morningo</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-accent sm:text-7xl">
            The Executive Assistant You Never Hired
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-600">
            Capture loose ends, turn your inbox into a daily brief, and start every morning with sharper priorities.
          </p>
        </div>

        <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-soft sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-normal text-accent">Welcome</h2>
            <p className="mt-2 text-sm text-neutral-500">Sign in or create your Morningo workspace.</p>
          </div>

          {error ? (
            <div className="mb-5 rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-medium text-accent">{error}</div>
          ) : null}

          <form className="space-y-4">
            <Input type="email" name="email" placeholder="Email address" autoComplete="email" required />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              minLength={6}
              required
            />
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <Button formAction={signIn}>Sign in</Button>
              <Button formAction={signUp} variant="secondary">
                Create account
              </Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
