import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white",
          "placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200 resize-y",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-slate-600 focus:border-blue-500 focus:ring-blue-500",
          className
        )}
        ref={ref}
        aria-invalid={error}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
