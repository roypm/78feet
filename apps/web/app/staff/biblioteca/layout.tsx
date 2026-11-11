import { NewTrainingVisitProvider } from "@/components/trainings/new-training-visit";

export default function BibliotecaLayout({ children }: { children: React.ReactNode }) {
  return <NewTrainingVisitProvider>{children}</NewTrainingVisitProvider>;
}
