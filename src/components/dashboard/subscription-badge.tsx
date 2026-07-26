import type { SubscriptionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const MAP: Record<
  SubscriptionStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  TRIAL: { label: "Trial", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "success" },
  GRACE_PERIOD: { label: "Grace period", variant: "warning" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  const { label, variant } = MAP[status] ?? MAP.EXPIRED;
  return <Badge variant={variant}>{label}</Badge>;
}
