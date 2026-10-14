import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/guard";

// Password changes are temporarily disabled (re-enable by swapping this
// notice back for <ChangePasswordForm /> from @/components/change-password-form).
export default async function AccountPage() {
  const { claims } = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {String(claims.email ?? "")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Password changes are temporarily disabled. Contact whoever manages the Supabase project if you need the
            admin password reset.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
