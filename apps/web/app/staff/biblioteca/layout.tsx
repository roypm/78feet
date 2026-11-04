import { NewTrainingVisitProvider } from "@/components/staff/new-training-visit";

export default function BibliotecaLayout({ children }: { children: React.ReactNode }) {
  return <NewTrainingVisitProvider>{children}</NewTrainingVisitProvider>;
}
