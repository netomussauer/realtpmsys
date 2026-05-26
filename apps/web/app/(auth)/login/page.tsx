import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o sistema de gestão da Academia de Futebol Real TPM.",
  robots: { index: false, follow: false },
};

/**
 * /login — página de autenticação.
 *
 * Server Component que renderiza o LoginForm (client). O Suspense é
 * exigido pelo Next 15 quando o componente usa `useSearchParams()` —
 * dispara hydration sem warning.
 *
 * Redirect pós-login para `?next=URL` é tratado pelo LoginForm.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-lg">
      <div className="h-7 w-40 rounded bg-muted animate-pulse" />
      <div className="mt-2 h-4 w-64 rounded bg-muted animate-pulse" />
      <div className="mt-6 space-y-4">
        <div className="h-10 rounded bg-muted animate-pulse" />
        <div className="h-10 rounded bg-muted animate-pulse" />
      </div>
      <div className="mt-6 h-11 rounded bg-muted animate-pulse" />
    </div>
  );
}
