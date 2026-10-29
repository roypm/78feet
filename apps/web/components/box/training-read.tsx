export function TrainingRead({
  name,
  classTypeName,
  phases,
}: {
  name: string;
  classTypeName?: string;
  phases: { id?: string; name: string; blocks: { id?: string; body: string }[] }[];
}) {
  return (
    <article className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold wrap-break-word">{name}</h2>
        {classTypeName ? <p className="text-sm text-muted-foreground">{classTypeName}</p> : null}
      </div>
      {phases.map((phase, phaseIndex) => (
        <section key={phase.id ?? phaseIndex} className="flex flex-col gap-2">
          <h3 className="font-medium wrap-break-word">{phase.name}</h3>
          {phase.blocks.map((block, blockIndex) => (
            <pre
              key={block.id ?? blockIndex}
              className="wrap-break-word font-sans text-sm whitespace-pre-wrap text-muted-foreground"
            >
              {block.body}
            </pre>
          ))}
        </section>
      ))}
    </article>
  );
}
