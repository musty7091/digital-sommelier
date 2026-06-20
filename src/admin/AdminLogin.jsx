import { useState } from 'react';

const ADMIN_SESSION_KEY = 'ds_admin_logged_in';
const DEFAULT_API_URL = 'http://localhost:8787';

function getLocalApiUrl() {
  return import.meta.env.VITE_LOCAL_IMAGE_API_URL || DEFAULT_API_URL;
}

export function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function setAdminLoggedIn() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setErrorMessage('Lütfen admin şifresini girin.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const response = await fetch(`${getLocalApiUrl()}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: cleanPassword,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'Admin girişi başarısız.');
      }

      setAdminLoggedIn();

      if (typeof onLogin === 'function') {
        onLogin();
      }
    } catch (error) {
      console.error('Admin girişi sırasında hata oluştu:', error);
      setErrorMessage(error.message || 'Admin girişi kontrol edilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-ink-950 text-cream-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gold-500/20 bg-charcoal-800/70 shadow-2xl overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-charcoal-700 bg-charcoal-900/40 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold-500/40 bg-wine-900/40 shadow-lg">
            <svg
              className="h-8 w-8 text-gold-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M6.5 20c.7-3.5 2.7-5.5 5.5-5.5s4.8 2 5.5 5.5"
              />
            </svg>
          </div>

          <h1 className="font-serif text-3xl font-semibold text-gold-400">
            Admin Girişi
          </h1>

          <p className="mt-2 text-sm text-cream-200/60">
            Ertan Digital Sommelier yönetim paneli
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-cream-200">
              Admin Şifresi
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-xl border border-charcoal-600 bg-ink-950 px-4 py-3 text-lg tracking-widest text-cream-100 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
              placeholder="••••"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gold-500 px-5 py-3 font-bold text-ink-950 shadow-lg transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Kontrol ediliyor...' : 'Giriş Yap'}
          </button>

          <p className="text-center text-xs text-cream-200/40">
            Bu giriş sadece lokal admin kullanımı içindir.
          </p>
        </form>
      </div>
    </main>
  );
}