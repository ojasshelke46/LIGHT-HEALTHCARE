"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function onClick() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
