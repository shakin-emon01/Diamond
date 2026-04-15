"use client";

import { cn } from "../../lib/ide-utils";

export function BootSplash({
  leaving = false,
  overlay = false
}: {
  leaving?: boolean;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "studio-boot",
        overlay && "studio-boot--overlay",
        leaving && "studio-boot--leaving"
      )}
      aria-hidden={overlay ? "true" : undefined}
    >
      <div className="studio-boot__noise" />
      <div className="studio-boot__orb studio-boot__orb--left" />
      <div className="studio-boot__orb studio-boot__orb--right" />

      <div className="studio-boot__center">
        <h1 className="diamond-brand diamond-brand--hero" aria-label="Diamond Compiler">
          <span className="diamond-brand-word diamond-brand-word--light">Diamond</span>
          <span className="diamond-brand-word diamond-brand-word--accent">Compiler</span>
        </h1>
        <div className="studio-boot__title-line" aria-hidden>
          <span className="studio-boot__title-line-bar" />
        </div>
      </div>
    </div>
  );
}
