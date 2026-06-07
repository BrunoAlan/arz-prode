type TeamLite = { name: string; flag: string | null };

export function TeamLabel({
  team,
  placeholder,
  className,
}: {
  team: TeamLite | null;
  placeholder?: string | null;
  className?: string;
}) {
  if (!team) {
    return (
      <span className={`text-muted-foreground ${className ?? ""}`}>
        {placeholder ?? "?"}
      </span>
    );
  }
  return (
    <span className={className}>
      {team.flag && (
        <span aria-hidden className="mr-1.5">
          {team.flag}
        </span>
      )}
      {team.name}
    </span>
  );
}
