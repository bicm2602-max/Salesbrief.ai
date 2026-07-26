import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn("py-16 sm:py-20 lg:py-24", className)} {...props}>
      {children}
    </section>
  );
}
