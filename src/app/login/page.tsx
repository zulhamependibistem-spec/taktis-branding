import { getSessionUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  await getSessionUser();
  return <LoginForm />;
}