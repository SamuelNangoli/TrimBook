"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut, updateSession } from "@/lib/auth";
import { getCurrentUser } from "@/lib/dal";
import { emailAuthSchema, startShopSchema } from "@/lib/validations/auth";
import { createShopForUser } from "@/server/services/auth.service";

export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
  | null;

/** Only allow same-site relative callback paths. */
function safeCallback(value: FormDataEntryValue | null): string {
  const cb = typeof value === "string" ? value : "";
  return cb.startsWith("/") && !cb.startsWith("//") ? cb : "/";
}

// -----------------------------------------------------------------------------
// Google OAuth
// -----------------------------------------------------------------------------
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  // Redirects to Google; the NEXT_REDIRECT it throws must propagate.
  await signIn("google", { redirectTo: callbackUrl });
}

// -----------------------------------------------------------------------------
// Email magic link
// -----------------------------------------------------------------------------
export async function signInWithEmailAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailAuthSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const callbackUrl = safeCallback(formData.get("callbackUrl"));

  try {
    // Sends the magic link, then redirects to the "check your email" page.
    await signIn("resend", { email: parsed.data.email, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "We couldn't send your link. Please try again." };
    }
    throw error; // NEXT_REDIRECT — must propagate
  }
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Start a shop (signed-in user becomes an OWNER)
// -----------------------------------------------------------------------------
export async function createShopAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/start-shop");

  const parsed = startShopSchema.safeParse({
    shopName: formData.get("shopName"),
    city: formData.get("city"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let shopId: string;
  try {
    const res = await createShopForUser(user.id, parsed.data);
    shopId = res.shopId;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not create your shop.";
    return { ok: false, message: msg };
  }

  // Refresh the JWT so the user is immediately an OWNER of the new shop.
  await updateSession({ role: "OWNER", shopId } as never);

  redirect("/dashboard");
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  const redirectTo = host ? `${proto}://${host}/login` : "/login";
  // signOut throws a NEXT_REDIRECT that must propagate — do not catch it.
  await signOut({ redirectTo });
}
