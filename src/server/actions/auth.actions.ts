"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ROLE_HOME } from "@/lib/constants";
import {
  loginSchema,
  registerSchema,
  shopRegisterSchema,
} from "@/lib/validations/auth";
import {
  registerCustomer,
  registerShopOwner,
  EmailTakenError,
} from "@/server/services/auth.service";

/**
 * Server Actions for authentication. Each returns a discriminated `FormState`
 * the client form renders. All validation runs here on the server — the client
 * schema is only for instant UX feedback.
 */
export type FormState =
  | { ok: true; redirectTo?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
  | null;

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------
export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    // redirect:false so we can return a role-aware destination to the client.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Invalid email or password." };
    }
    throw error;
  }

  // Sign-in succeeded — route the user to their role's home.
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true },
  });
  const redirectTo = user ? ROLE_HOME[user.role] : "/";
  return { ok: true, redirectTo };
}

// -----------------------------------------------------------------------------
// Customer registration
// -----------------------------------------------------------------------------
export async function registerCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await registerCustomer(parsed.data);
    // Auto sign-in after registration.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { ok: false, fieldErrors: { email: [error.message] } };
    }
    if (error instanceof AuthError) {
      return { ok: false, message: "Could not sign you in. Please try logging in." };
    }
    throw error;
  }

  return { ok: true, redirectTo: ROLE_HOME.CUSTOMER };
}

// -----------------------------------------------------------------------------
// Shop-owner onboarding
// -----------------------------------------------------------------------------
export async function registerShopAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = shopRegisterSchema.safeParse({
    ownerName: formData.get("ownerName"),
    shopName: formData.get("shopName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await registerShopOwner(parsed.data);
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { ok: false, fieldErrors: { email: [error.message] } };
    }
    if (error instanceof AuthError) {
      return { ok: false, message: "Account created, but sign-in failed. Please log in." };
    }
    throw error;
  }

  return { ok: true, redirectTo: ROLE_HOME.OWNER };
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  // signOut throws a NEXT_REDIRECT that must propagate — do not catch it.
  await signOut({ redirectTo: "/login" });
}
