import Link from "next/link";
import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { SIGN_IN_PATH } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard title="Create account">
      <RegisterForm />

      <Link href={SIGN_IN_PATH} className="btn btn-ghost">
        Already have an account? Sign in
      </Link>
    </AuthCard>
  );
}
