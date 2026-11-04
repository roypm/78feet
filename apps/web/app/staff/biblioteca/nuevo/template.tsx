/** Each visit remounts the page so Activity cannot restore a cancelled draft. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
}
