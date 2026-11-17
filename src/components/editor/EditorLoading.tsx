export function EditorLoading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-4 text-text">
      <p aria-hidden className="font-serif text-xl font-semibold tracking-tight">
        Resume Maker
      </p>
      <p role="status" className="text-sm text-muted">
        Loading editor…
      </p>
    </main>
  );
}
