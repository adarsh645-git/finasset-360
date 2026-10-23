import type { ReactNode } from "react";
import type { Theme } from "@/lib/theme";

// The root document, already in the User's theme so there is no flash.
export function Document({
  theme,
  className,
  children,
}: {
  theme: Theme;
  className?: string;
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme={theme} className={`${className ?? ""} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
