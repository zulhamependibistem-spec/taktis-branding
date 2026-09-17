import { getSessionUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

const NOTICE: Record<string, string> = {
  expired: "Sesi berakhir. Silakan masuk lagi.",
  logout: "Anda telah keluar.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  await getSessionUser();
  const { reason } = await searchParams;
  return <LoginForm notice={reason ? (NOTICE[reason] ?? null) : null} />;
}
