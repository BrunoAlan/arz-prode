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
  const lastIdx = rounds.length - 1;
  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max">
          {rounds.map((round, roundIdx) => (
            <div key={round.key} className="flex w-56 flex-col">
              <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {round.title}
              </h3>
              <div className="flex flex-1 flex-col">
                {round.cards.map((card, i) => (
                  <div
                    key={i}
                    className="bk-cell"
                    data-sender={roundIdx < lastIdx ? "" : undefined}
                  >
                    <div className="w-full">
                      <BracketMatchCard data={card} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {thirdPlace && (
        <div className="mt-8 w-56">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tercer puesto
          </h3>
          <BracketMatchCard data={thirdPlace} />
        </div>
      )}
    </div>
  );
}
