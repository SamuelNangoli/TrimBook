import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";

/**
 * Export all subscriptions as CSV. Super-admin only (enforced server-side).
 */
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Escape quotes and wrap fields that contain commas/quotes/newlines.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function isoDate(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export async function GET() {
  await requireRole("SUPER_ADMIN");

  const subs = await prisma.subscription.findMany({
    include: { shop: { select: { name: true, city: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "shop",
    "city",
    "slug",
    "plan",
    "status",
    "amount",
    "currency",
    "trial_ends",
    "current_period_end",
    "grace_ends",
    "created",
  ];

  const rows = subs.map((s) =>
    [
      s.shop.name,
      s.shop.city,
      s.shop.slug,
      s.plan,
      s.status,
      s.amount,
      s.currency,
      isoDate(s.trialEndsAt),
      isoDate(s.currentPeriodEnd),
      isoDate(s.gracePeriodEndsAt),
      isoDate(s.createdAt),
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `trimbook-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
