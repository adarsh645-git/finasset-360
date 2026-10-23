"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { projectionCookie, projectionLabel } from "@/lib/chart/projection";

type Ctx = { projection: boolean; horizon: number; setProjection: (on: boolean) => void };

const ProjectionContext = createContext<Ctx>({ projection: true, horizon: 10, setProjection: () => {} });

export function ProjectionProvider({
  initial,
  horizon,
  children,
}: {
  initial: boolean;
  horizon: number;
  children: ReactNode;
}) {
  const [projection, setState] = useState(initial);
  const setProjection = useCallback((on: boolean) => {
    setState(on);
    document.cookie = projectionCookie(on);
  }, []);
  const value = useMemo(() => ({ projection, horizon, setProjection }), [projection, horizon, setProjection]);
  return <ProjectionContext.Provider value={value}>{children}</ProjectionContext.Provider>;
}

export const useProjection = () => useContext(ProjectionContext);

export function ProjectionToggle() {
  const { projection, horizon, setProjection } = useProjection();
  return (
    <button
      type="button"
      aria-pressed={projection}
      onClick={() => setProjection(!projection)}
      className="rounded-full border border-line2 bg-panel px-3 text-[12.5px] text-ink2 hover:bg-hover"
    >
      {projectionLabel(projection, horizon)}
    </button>
  );
}
