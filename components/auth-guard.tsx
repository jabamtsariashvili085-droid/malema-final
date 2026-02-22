"use client";

import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/components/login-page";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
