"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { Theme } from "@/lib/theme";
import { addAssetHref } from "@/lib/views/links";
import { markActive, type ClassRow, type NavItem, type Shell } from "@/lib/views/shell";

// One frame, three nav forms from one Shell: sidebar (>=1024px), top bar with
// scrolling tabs (640-1023px), top bar with a bottom tab bar (<640px). CSS
// breakpoints pick the form; nothing measures the window. It is a client
// component only because the active item follows usePathname (layouts don't
// re-render on navigation).

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex h-5 w-5 items-end justify-center gap-0.5 rounded-md bg-ink p-1"
      >
        <span className="h-[5px] w-[3px] rounded-[1px] bg-bg" />
        <span className="h-[9px] w-[3px] rounded-[1px] bg-bg" />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">FinAsset 360</span>
    </span>
  );
}

// A link only when its page exists; otherwise plain text with the same content.
function NavEntry({
  item,
  className,
  children,
}: {
  item: NavItem;
  className: string;
  children: ReactNode;
}) {
  const props = {
    className,
    "data-label": item.label,
    "aria-current": item.active ? ("page" as const) : undefined,
  };
  return item.href ? (
    <Link href={item.href} {...props}>
      {children}
    </Link>
  ) : (
    <span {...props}>{children}</span>
  );
}

function NetWorth({ shell }: { shell: Shell }) {
  const { total, change, tone } = shell.netWorth;
  return (
    <div data-section="net-worth" className="flex flex-col gap-1 px-2">
      <span className="text-[11px] uppercase tracking-[0.04em] text-ink2">Net worth</span>
      <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums">{total}</span>
      <span
        data-tone={tone ?? undefined}
        className={`text-[12px] tabular-nums ${
          tone === "up" ? "text-pos" : tone === "down" ? "text-neg" : "text-ink2"
        }`}
      >
        {change}
      </span>
    </div>
  );
}

// A link when the class page exists (row.href), plain text otherwise.
function ClassEntry({ row }: { row: ClassRow }) {
  const className = `flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] ${
    row.selected ? "bg-sel font-medium" : ""
  } ${row.href ? "hover:bg-sel" : ""}`;
  const content = (
    <>
      <span
        aria-hidden
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: `var(${row.dot})` }}
      />
      <span className="flex-1 truncate">{row.name}</span>
      <span className="tabular-nums text-ink2">{row.value}</span>
    </>
  );
  return row.href ? (
    <Link
      href={row.href}
      data-class={row.id}
      aria-current={row.selected ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  ) : (
    <span data-class={row.id} className={className}>
      {content}
    </span>
  );
}

export function ShellFrame({
  shell: base,
  theme,
  children,
}: {
  shell: Shell;
  theme: Theme;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const shell = markActive(base, pathname);
  const addHref = shell.adding ? addAssetHref(pathname ?? "/", search) : null;

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col gap-[22px] overflow-auto border-r border-line px-3.5 pb-[18px] pt-[22px] lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <NetWorth shell={shell} />
        <nav data-nav="sidebar" className="flex flex-col gap-0.5">
          {shell.items.map((item) => (
            <NavEntry
              key={item.key}
              item={item}
              className={`flex h-10 items-center justify-between gap-2 rounded-lg px-2.5 text-[13.5px] ${
                item.active ? "bg-sel font-medium" : "font-normal"
              } ${item.href ? "hover:bg-sel" : ""}`}
            >
              <span>{item.label}</span>
              {item.value && <span className="tabular-nums text-ink2">{item.value}</span>}
            </NavEntry>
          ))}
        </nav>
        {shell.classes.length > 0 && (
          <section data-section="classes" className="flex flex-col gap-0.5">
            <h2 className="px-2.5 pb-1 text-[11px] font-normal uppercase tracking-[0.04em] text-ink2">
              Asset classes
            </h2>
            {shell.classes.map((row) => (
              <ClassEntry key={row.id} row={row} />
            ))}
          </section>
        )}
        {addHref && (
          <Link
            href={addHref}
            className="flex h-10 items-center rounded-lg border border-line px-2.5 text-[13.5px] font-medium hover:bg-sel"
          >
            + Add account or asset
          </Link>
        )}
        <div className="flex-1" />
        <div className="flex flex-col gap-2">
          <ThemeToggle theme={theme} />
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="truncate text-[13px] text-ink2">{shell.userName}</span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-col gap-2.5 border-b border-line bg-bg px-4 pb-2.5 pt-3 lg:hidden">
          <div className="flex items-center justify-between gap-2.5">
            <Brand />
            <div className="flex items-center gap-2">
              <span className="hidden max-w-32 truncate text-[13px] text-ink2 sm:inline">
                {shell.userName}
              </span>
              {addHref && (
                <Link
                  href={addHref}
                  className="flex h-10 items-center rounded-lg border border-line px-3 text-[13px] font-medium"
                >
                  + Add
                </Link>
              )}
              <ThemeToggle theme={theme} short />
              <SignOutButton />
            </div>
          </div>
          <nav data-nav="tabs" className="hidden gap-1 overflow-x-auto sm:flex">
            {shell.items.map((item) => (
              <NavEntry
                key={item.key}
                item={item}
                className={`flex h-10 flex-none items-center rounded-lg px-3 text-[13px] ${
                  item.active ? "bg-sel font-medium" : "font-normal"
                }`}
              >
                {item.label}
                {item.value && <span className="ml-1.5 tabular-nums text-ink2">{item.value}</span>}
              </NavEntry>
            ))}
          </nav>
        </header>

        <div className="@container min-w-0 flex-1">
          <main className="mx-auto w-full max-w-[1200px] px-4 pb-[76px] pt-[18px] sm:px-[clamp(16px,3.2vw,44px)] sm:pb-16 sm:pt-[clamp(18px,3.2vw,40px)]">
            {children}
          </main>
        </div>
      </div>

      <nav
        data-nav="bottom"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {shell.items.map((item) => (
          <NavEntry
            key={item.key}
            item={item}
            className={`relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center text-[11px] ${
              item.active ? "font-medium text-ink" : "text-ink2"
            }`}
          >
            {item.active && (
              <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-ink" />
            )}
            {item.label}
            {item.value && <span className="tabular-nums text-ink2">{item.value}</span>}
          </NavEntry>
        ))}
      </nav>
    </div>
  );
}
