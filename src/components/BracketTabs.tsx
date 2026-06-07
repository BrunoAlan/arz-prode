"use client";

import { useState } from "react";
import {
  BracketMatchCard,
  type BracketCardData,
  type BracketRoundView,
} from "@/components/BracketMatchCard";

export function BracketTabs({
  rounds,
  thirdPlace,
}: {
  rounds: BracketRoundView[];
  thirdPlace: BracketCardData | null;
}) {
  const tabs: BracketRoundView[] = thirdPlace
    ? [...rounds, { key: "third", title: "3°", cards: [thirdPlace] }]
    : rounds;
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="md:hidden">
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
              t.key === active
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {current?.cards.map((card, i) => (
          <BracketMatchCard key={i} data={card} />
        ))}
      </div>
    </div>
  );
}
