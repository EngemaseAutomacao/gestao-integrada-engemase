import { ReactNode } from "react";

interface ModuleHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Optional floating content (e.g. stats cards) overlaying the bottom of the hero. */
  floating?: ReactNode;
  /** When true, omit the negative margin breakout (use inside pages that don't use the standard padding). */
  inline?: boolean;
}

export function ModuleHero({ eyebrow, title, subtitle, floating, inline }: ModuleHeroProps) {
  return (
    <div className={inline ? "" : "-mx-3 sm:-mx-6 -mt-3 sm:-mt-6"}>
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 lg:pt-10 pb-20 sm:pb-24 lg:pb-28 rounded-b-3xl lg:rounded-b-[2rem]">
        <div className="absolute -top-10 -right-10 w-40 h-40 lg:w-96 lg:h-96 rounded-full bg-white/10 blur-2xl lg:blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-6 lg:right-32 w-24 h-24 lg:w-40 lg:h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <p className="text-[10px] lg:text-xs uppercase tracking-[0.25em] opacity-80 font-semibold">
            {eyebrow}
          </p>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-sm lg:text-base opacity-90 line-clamp-2 lg:mt-1 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </header>
      {floating && (
        <div className="px-3 sm:px-6 lg:px-12 -mt-14 sm:-mt-16 relative z-10 max-w-6xl mx-auto w-full">
          {floating}
        </div>
      )}
    </div>
  );
}
