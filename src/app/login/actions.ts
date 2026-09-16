"use server";

import { loginService } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<
  | { success: true; redirect: string }
  | { success: false; error: string }
> {
  const nip = String(formData.get("nip") || "").trim();
  const result = await loginService(nip);
  if (!result.success) {
    return { success: false, error: result.error } as const;
  }
  const { role } = result.user;
  const redirect =
    role === "admin" || role === "pic" ? "/admin" : role === "tl" ? "/tl" : "/spg";
  return { success: true, redirect } as const;
}