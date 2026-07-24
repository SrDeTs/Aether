import type { ReactNode } from "react";

export function InstrumentationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
