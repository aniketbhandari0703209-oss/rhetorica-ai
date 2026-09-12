import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  UserRound,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  theme: 'dark' | 'light';
}

export default function AuthScreen({
  theme,
}: AuthScreenProps) {
  const dark = theme === 'dark';

  const [mode, setMode] =
    useState<'signin' | 'signup'>('signin');

  const [username, setUsername] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError(null);
    setMessage(null);

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanUsername =
      username.trim();

    if (!cleanEmail || !password) {
      setError(
        'Please enter your email and password.',
      );
      return;
    }

    if (mode === 'signup') {
      if (
        !/^[A-Za-z0-9_]{3,32}$/.test(
          cleanUsername,
        )
      ) {
        setError(
          'Username must be 3–32 characters and use only letters, numbers, or underscores.',
        );
        return;
      }

      if (password.length < 8) {
        setError(
          'Password must be at least 8 characters.',
        );
        return;
      }

      if (
        password !== confirmPassword
      ) {
        setError(
          'Passwords do not match.',
        );
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const {
          data,
          error: signUpError,
        } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
          options: {
  data: {
    username:
      cleanUsername,
  },
},
          });

        if (signUpError) {
          throw signUpError;
        }

       setMessage(
  'Account created successfully. Welcome to Rhetorica.',
);
      } else {
        const {
          error: signInError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: cleanEmail,
              password,
            },
          );

        if (signInError) {
          throw signInError;
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Authentication failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const field =
    `w-full rounded-lg border px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 ${
      dark
        ? 'border-[#193b5d] bg-[#020a14] text-[#eef6ff] placeholder:text-[#667a94]'
        : 'border-[#afc3da] bg-white text-[#07152b] placeholder:text-[#657994]'
    }`;

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${
        dark
          ? 'bg-[#020812] text-[#eef6ff]'
          : 'bg-[#f6f9fd] text-[#07152b]'
      }`}
    >
      <div
        className={`absolute inset-0 ${
          dark
            ? 'bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.14),transparent_38%)]'
            : 'bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.08),transparent_38%)]'
        }`}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 text-center">
            <div
              className={`text-[28px] font-extrabold tracking-[-0.055em] ${
                dark
                  ? 'text-white'
                  : 'text-[#07152b]'
              }`}
            >
              Rhetorica{' '}
              <span className="text-[#2563eb]">
                AI
              </span>
            </div>

            <div
              className={`mt-1 text-[8px] font-bold uppercase tracking-[0.20em] ${
                dark
                  ? 'text-[#8ca1bb]'
                  : 'text-[#526883]'
              }`}
            >
              Speech Intelligence Platform
            </div>
          </div>

          <div
            className={`rounded-2xl border p-7 shadow-[0_24px_80px_rgba(2,8,18,0.18)] backdrop-blur-xl sm:p-9 ${
              dark
                ? 'border-[#193653] bg-[#071321]/95'
                : 'border-[#c9d9ea] bg-white/95'
            }`}
          >
            <div className="mb-7">
              <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-500">
                Private Workspace
              </div>

              <h1
                className={`font-serif text-[31px] font-bold tracking-[-0.025em] ${
                  dark
                    ? 'text-[#f4f8ff]'
                    : 'text-[#06152c]'
                }`}
                style={{
                  fontFamily:
                    'Georgia, "Times New Roman", serif',
                }}
              >
                {mode === 'signin'
                  ? 'Welcome back.'
                  : 'Create your account.'}
              </h1>

              <p
                className={`mt-2 text-sm leading-6 ${
                  dark
                    ? 'text-[#9aabc0]'
                    : 'text-[#334d6d]'
                }`}
              >
                {mode === 'signin'
                  ? 'Sign in to access your private speech workspace.'
                  : 'Your speeches and analyses will belong only to your account.'}
              </p>
            </div>

            <form
              onSubmit={submit}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <div>
                  <label
                    className={`mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                      dark
                        ? 'text-blue-300'
                        : 'text-blue-700'
                    }`}
                  >
                    <UserRound className="h-4 w-4" />
                    Username
                  </label>

                  <input
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value,
                      )
                    }
                    autoComplete="username"
                    placeholder="e.g. rhetorica_user"
                    className={field}
                  />
                </div>
              )}

              <div>
                <label
                  className={`mb-2 block text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                    dark
                      ? 'text-blue-300'
                      : 'text-blue-700'
                  }`}
                >
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={field}
                />
              </div>

              <div>
                <label
                  className={`mb-2 block text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                    dark
                      ? 'text-blue-300'
                      : 'text-blue-700'
                  }`}
                >
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  autoComplete={
                    mode === 'signin'
                      ? 'current-password'
                      : 'new-password'
                  }
                  placeholder="••••••••"
                  className={field}
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label
                    className={`mb-2 block text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                      dark
                        ? 'text-blue-300'
                        : 'text-blue-700'
                    }`}
                  >
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    value={
                      confirmPassword
                    }
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={field}
                  />
                </div>
              )}

              {error && (
                <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5 text-sm text-blue-600">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5 text-sm text-blue-600">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1769ed] px-5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(37,99,235,0.24)] transition hover:bg-[#2878f5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {loading
                  ? 'Please wait'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
            </form>

            <div
              className={`mt-7 border-t pt-6 text-center text-sm ${
                dark
                  ? 'border-[#193653] text-[#9aabc0]'
                  : 'border-[#c9d9ea] text-[#526883]'
              }`}
            >
              {mode === 'signin'
                ? 'New to Rhetorica?'
                : 'Already have an account?'}{' '}

              <button
                type="button"
                onClick={() => {
                  setMode(
                    mode === 'signin'
                      ? 'signup'
                      : 'signin',
                  );
                  setError(null);
                  setMessage(null);
                }}
                className="font-extrabold text-blue-600 hover:text-blue-500"
              >
                {mode === 'signin'
                  ? 'Create an account'
                  : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}