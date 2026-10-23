// Shown inside the shell the moment a nav item is clicked, while the page's
// Portfolio read streams in. Being a static fallback, it is prefetched with the link.
const BLOCK = "animate-pulse rounded-[14px] border border-line bg-panel";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-32 animate-pulse rounded bg-hover" />
      <div className="h-10 w-48 animate-pulse rounded bg-hover" />
      <div className={`${BLOCK} h-[280px]`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${BLOCK} h-[92px]`} />
        <div className={`${BLOCK} h-[92px]`} />
        <div className={`${BLOCK} h-[92px]`} />
      </div>
    </div>
  );
}
