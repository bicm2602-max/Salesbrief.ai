import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ size = "md", className, ...props }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  }[size];

  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <LoaderCircle className={cn("animate-spin text-muted-foreground", sizeClass)} />
    </div>
  );
}
