import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed Middleware to Proxy (same mechanism). This refreshes
// the Supabase session cookie on every request and does an optimistic
// redirect for unauthenticated visitors — it is not a substitute for real
// authorization, so every server action and route handler re-checks the
// session independently (see lib/supabase/guard.ts).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico and other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
