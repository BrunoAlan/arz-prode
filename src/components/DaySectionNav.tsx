export function DaySectionNav({
  sections,
  activeKey,
}: {
  sections: { key: string; title: string }[];
  activeKey: string | null;
}) {
  return (
    <nav className="sticky top-14 z-10 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b bg-background/80 px-4 py-2 backdrop-blur">
      {sections.map((s) => {
        const active = s.key === activeKey;
        return (
          <a
            key={s.key}
            href={`#${s.key}`}
            aria-current={active ? "true" : undefined}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? "border-foreground/40 font-medium text-foreground"
                : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {s.title}
          </a>
        );
      })}
    </nav>
  );
}
