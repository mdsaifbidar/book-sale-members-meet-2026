import { Loader2Icon } from "lucide-react";

export function PageSpinner() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
