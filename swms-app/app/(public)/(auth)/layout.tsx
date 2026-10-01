// /login and /signup share one frame, so switching tabs keeps the scene in place.

import { AuthShell } from "@/features/auth";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
