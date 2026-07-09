/**
 * Root. In practice the middleware redirects authenticated staff to their
 * role home and everyone else to /login before this renders.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Light Healthcare — HMS</h1>
      <p className="text-slate-600">
        Staff portal. You should be redirected by role. If you see this, you are
        not signed in.
      </p>
      <a
        href="/login"
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Sign in
      </a>
    </main>
  );
}
