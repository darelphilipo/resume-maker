import { Launcher } from "@/components/launcher/Launcher";

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-text sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Resume Maker
          </h1>
          <p className="max-w-lg text-sm opacity-70 sm:text-base">
            Start from a PDF, pasted text, or a role preset, then print a clean
            PDF. Everything stays in your browser.
          </p>
        </header>
        <Launcher />
      </div>
    </main>
  );
}
