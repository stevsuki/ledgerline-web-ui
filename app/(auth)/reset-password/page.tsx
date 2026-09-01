import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { ResetRequestForm } from "@/components/auth/reset-request-form";
import { OTP_VALIDITY_LABEL } from "@/lib/auth/fields";
import {
  RESET_STEPS,
  RESET_STEP_PARAM,
  SIGN_IN_PATH,
  resetStepHref,
} from "@/lib/auth/routes";
import { readResetGrant } from "@/lib/auth/session";
import { readOption } from "@/lib/search-params";

export const metadata: Metadata = { title: "Reset password" };

function BackToSignIn() {
  return (
    <Link href={SIGN_IN_PATH} className="btn btn-ghost">
      Back to sign in
    </Link>
  );
}

function RequestStep() {
  return (
    <AuthCard
      kicker="Step 1 of 2"
      title="Reset password"
      intro={`Enter the email on your account, then the OTP we send to it. The code is valid for ${OTP_VALIDITY_LABEL}.`}
    >
      <ResetRequestForm />
      <BackToSignIn />
    </AuthCard>
  );
}

function ResetStep() {
  return (
    <AuthCard
      kicker="Step 2 of 2"
      title="New password"
      intro="Pick a password you have not used on this account before."
    >
      <NewPasswordForm />
      <BackToSignIn />
    </AuthCard>
  );
}

const STEP_VIEWS: Record<(typeof RESET_STEPS)[number], () => ReactNode> = {
  request: RequestStep,
  reset: ResetStep,
};

export default async function ResetPasswordPage(
  props: Readonly<PageProps<"/reset-password">>,
) {
  const params = await props.searchParams;
  const step = readOption(params, RESET_STEP_PARAM, RESET_STEPS);

  // The second leg only exists while the OTP grant does. Landing on it with an
  // expired or absent grant — a bookmark, a reload an hour later — goes back
  // to the first leg rather than showing a form that could never submit.
  if (step === "reset" && !(await readResetGrant())) {
    redirect(resetStepHref("request"));
  }

  const StepView = STEP_VIEWS[step];
  return <StepView />;
}
