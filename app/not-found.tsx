import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Link href="/" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
            Return home
          </Link>
        }
      />
    </div>
  );
}
