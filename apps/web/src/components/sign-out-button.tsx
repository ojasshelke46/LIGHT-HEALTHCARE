"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function onClick() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      data-testid="sign-out"
      aria-label="Sign out"
      className={cn(className)}
    >
      Sign out
    </Button>
  );
}
