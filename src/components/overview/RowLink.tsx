import Link from "next/link";
import type { ReactNode } from "react";

/** A link when the target's page exists (`href` set), otherwise a plain block. */
export function RowLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  return href ? (
    <Link href={href} className={`${className ?? ""} hover:bg-hover`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
