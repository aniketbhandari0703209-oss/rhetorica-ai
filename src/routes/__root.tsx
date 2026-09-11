import {
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

import '../styles.css';

function ErrorComponent({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const message =
    error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Rhetorica AI</title>
      </head>

      <body>
        <div className="min-h-screen bg-[#020617] text-[#eaf2ff]">
          <div className="flex min-h-screen items-center justify-center px-6">
            <div className="w-full max-w-lg rounded-2xl border border-[#173552] bg-[#071225] p-8 shadow-2xl">
              <div className="mb-6">
                <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-400">
                  Rhetorica AI
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Something went wrong
                </h1>

                <p className="mt-3 text-sm leading-6 text-[#9db0c8]">
                  The speech intelligence workspace encountered an
                  unexpected error.
                </p>
              </div>

              <div className="mb-6 rounded-xl border border-[#173552] bg-[#030c17] p-4">
                <p className="break-words text-xs leading-5 text-[#8fa5bf]">
                  {message}
                </p>
              </div>

              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-[#2563eb] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#3b82f6]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <meta
          name="theme-color"
          content="#020617"
        />

        <meta
          name="description"
          content="Rhetorica AI — an intelligent speech direction and analysis platform."
        />

        <title>Rhetorica AI</title>
      </head>

      <body>
        <Outlet />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ErrorComponent,
});