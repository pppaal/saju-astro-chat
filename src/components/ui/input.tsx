import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white",
            "placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-200",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-600 focus:border-blue-500 focus:ring-blue-500",
            icon && "pl-10",
            className
          )}
          ref={ref}
          aria-invalid={error}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
