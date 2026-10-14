import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Re-checks the session on the server. Proxy already redirects
 * unauthenticated browser navigations, but it is only an optimistic check —
 * every page and server action that touches data calls this too, so a
 * missing or expired session can never reach the database layer.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login");
  }
  return { supabase, claims: data.claims };
}
