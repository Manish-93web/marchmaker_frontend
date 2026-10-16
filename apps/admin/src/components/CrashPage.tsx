/** Shown instead of a blank screen if something unexpected breaks while rendering. */
export function CrashPage() {
  return (
    <main className="mx-auto max-w-md p-8 text-center" role="alert">
      <h1 className="font-display text-2xl text-primary">Something went wrong</h1>
      <p className="mt-2 text-muted">We have been told about it. Please reload the page; if it keeps happening, contact support.</p>
      <button type="button" className="mt-4 min-h-[44px] rounded-pill bg-primary px-6 text-primary-fg" onClick={() => window.location.reload()}>
        Reload
      </button>
    </main>
  );
}
