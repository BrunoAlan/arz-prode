import {
  BracketMatchCard,
  type BracketCardData,
  type BracketRoundView,
} from "@/components/BracketMatchCard";

export function Bracket({
  rounds,
  thirdPlace,
}: {
  rounds: BracketRoundView[];
  thirdPlace: BracketCardData | null;
}) {
  return (
    <div className="hidden md:block">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {rounds.map((round, roundIdx) => (
          <div key={round.key} className="flex min-w-[180px] flex-col">
            <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {round.title}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.cards.map((card, i) => (
                <div
                  key={i}
                  className={
                    roundIdx < rounds.length - 1
                      ? "relative after:absolute after:left-full after:top-1/2 after:h-px after:w-4 after:bg-border after:content-['']"
                      : undefined
                  }
                >
                  <BracketMatchCard data={card} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {thirdPlace && (
        <div className="mt-6 max-w-[220px]">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tercer puesto
          </h3>
          <BracketMatchCard data={thirdPlace} />
        </div>
      )}
    </div>
  );
}
