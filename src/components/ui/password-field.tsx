"use client";

import * as React from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Rule = { label: string; ok: boolean };

/**
 * Password input with:
 *  - a show/hide toggle,
 *  - a green check when the value is valid,
 *  - an optional live requirements checklist (for new passwords), and
 *  - an optional `match` value (for "confirm password" fields).
 *
 * Controlled internally; submits via its `name`. `onValueChange` lets a parent
 * mirror the value (used to feed a confirm field's `match`).
 */
export function PasswordField({
  requirements = false,
  match,
  className,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  requirements?: boolean;
  /** When provided, the field is valid only if it equals this value. */
  match?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = React.useState("");
  const [visible, setVisible] = React.useState(false);

  const rules: Rule[] = requirements
    ? [
        { label: "At least 8 characters", ok: value.length >= 8 },
        { label: "Contains a letter", ok: /[a-zA-Z]/.test(value) },
        { label: "Contains a number", ok: /[0-9]/.test(value) },
      ]
    : [];

  const meetsRules = rules.every((r) => r.ok);
  const matches = match === undefined ? true : value.length > 0 && value === match;
  const valid = value.length > 0 && meetsRules && matches;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onValueChange?.(e.target.value);
          }}
          className={cn("pr-16", valid && "border-success/60", className)}
          aria-invalid={value.length > 0 && !valid ? true : undefined}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {valid && (
            <Check className="mr-1 size-4 text-success" aria-label="Valid" />
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="flex h-full w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {requirements && value.length > 0 && (
        <ul className="grid gap-1">
          {rules.map((r) => (
            <li
              key={r.label}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                r.ok ? "text-success" : "text-muted-foreground",
              )}
            >
              {r.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {r.label}
            </li>
          ))}
        </ul>
      )}

      {match !== undefined && value.length > 0 && (
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs",
            matches ? "text-success" : "text-destructive",
          )}
        >
          {matches ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          {matches ? "Passwords match" : "Passwords don't match yet"}
        </p>
      )}
    </div>
  );
}
