"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border bg-slate-900 px-3 py-2 pr-10 text-sm text-white",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-200",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-600 focus:border-blue-500 focus:ring-blue-500",
            className
          )}
          ref={ref}
          aria-invalid={error}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";

// Option component for consistency
const SelectOption = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
  <option ref={ref} className={cn("bg-slate-900 text-white", className)} {...props} />
));
SelectOption.displayName = "SelectOption";

export { Select, SelectOption };
