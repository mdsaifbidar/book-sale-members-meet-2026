import { requireUser } from "@/lib/supabase/guard";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { claims } = await requireUser();

  return <AppShell email={String(claims.email ?? "")}>{children}</AppShell>;
}
