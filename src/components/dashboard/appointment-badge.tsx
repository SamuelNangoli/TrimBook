import type { AppointmentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const MAP: Record<
  AppointmentStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  NO_SHOW: { label: "No-show", variant: "destructive" },
  RESCHEDULED: { label: "Rescheduled", variant: "secondary" },
};

export function AppointmentBadge({ status }: { status: AppointmentStatus }) {
  const { label, variant } = MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}
