"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Text/email/tel input that shows a green check on the right once the value
 * passes `validate`. Controlled internally so the tick updates as the user
 * types; still submits normally via its `name`.
 */
export function ValidatedInput({
  validate,
  className,
  onValueChange,
  defaultValue,
  ...props
}: Omit<React.ComponentProps<"input">, "defaultValue"> & {
  validate: (value: string) => boolean;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const valid = value.trim().length > 0 && validate(value);

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        className={cn(valid && "pr-9 border-success/60", className)}
        aria-invalid={value.length > 0 && !valid ? true : undefined}
      />
      {valid && (
        <Check
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-success"
          aria-label="Valid"
        />
      )}
    </div>
  );
}
