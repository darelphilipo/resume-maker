import { Launcher } from "@/components/launcher/Launcher";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-text">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <header className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl bg-text text-surface shadow-[0_4px_12px_rgba(23,40,57,0.18)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-5"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M6.75 3.75h7.5L18.75 8.25v12H6.75z"
                  strokeLinejoin="round"
                />
                <path d="M14.25 3.75v4.5h4.5" strokeLinejoin="round" />
                <path
                  d="M9.75 12.25h6M9.75 15.25h6M9.75 18.25h3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div className="flex flex-col">
              <h1 className="font-serif text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                Resume Maker
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Free resume builder
              </p>
            </div>
          </div>
        </header>

        <section aria-labelledby="home-heading" className="mt-8 sm:mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6a3b]">
            Your next resume
          </p>
          <h2
            id="home-heading"
            className="mt-2 max-w-2xl font-serif text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl"
          >
            A professional resume, built in your browser.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Bring the resume you already have or start from a role template.
            Your edits stay on this device and print straight from your browser.
          </p>
        </section>

        <Launcher />
      </div>
    </main>
  );
}
