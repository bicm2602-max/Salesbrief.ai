import { cn } from "@/lib/utils";

interface PageWrapperProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PageWrapper({ className, children, ...props }: PageWrapperProps) {
  return (
    <main className={cn("flex min-h-screen flex-col", className)} {...props}>
      {children}
    </main>
  );
}
