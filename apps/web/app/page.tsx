import Link from "next/link";

export default function Home() {
  return (
    <main className="px-6 py-8">
      <div>78feet</div>
      <p className="mt-2">
        <Link href="/login" className="text-[var(--color-primary)]">
          Entrar
        </Link>
      </p>
    </main>
  );
}
