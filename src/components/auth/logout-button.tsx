"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="size-4" />
        Sign out
      </Button>
    </form>
  );
}
