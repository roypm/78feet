export function TrainingRead({
  name,
  classTypeName,
  phases,
  showHeading = true,
}: {
  name: string;
  classTypeName?: string;
  phases: { id?: string; name: string; blocks: { id?: string; body: string }[] }[];
  showHeading?: boolean;
}) {
  return (
    <article className="flex flex-col gap-4">
      {showHeading ? (
        <div>
          <h2 className="text-lg font-semibold wrap-break-word">{name}</h2>
          {classTypeName ? <p className="text-sm text-muted-foreground">{classTypeName}</p> : null}
        </div>
      ) : null}
      {phases.map((phase, phaseIndex) => (
        <section key={phase.id ?? phaseIndex} className="flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
              {String(phaseIndex + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold wrap-break-word">{phase.name || `Fase ${phaseIndex + 1}`}</h3>
            </div>
          </div>
          <div className="flex flex-col gap-3 pl-11">
            {phase.blocks.map((block, blockIndex) => (
              <p
                key={block.id ?? blockIndex}
                className="border-l-2 border-border pl-3 text-sm leading-6 whitespace-pre-wrap wrap-break-word"
              >
                {block.body}
              </p>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
