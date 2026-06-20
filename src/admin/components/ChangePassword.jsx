import { useState } from 'react';

const DEFAULT_API_URL = 'http://localhost:8787';

function getLocalApiUrl() {
  return import.meta.env.VITE_LOCAL_IMAGE_API_URL || DEFAULT_API_URL;
}

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordAgain, setNewPasswordAgain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const resetMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    resetMessages();

    const cleanCurrentPassword = currentPassword.trim();
    const cleanNewPassword = newPassword.trim();
    const cleanNewPasswordAgain = newPasswordAgain.trim();

    if (!cleanCurrentPassword) {
      setErrorMessage('Mevcut şifre zorunludur.');
      return;
    }

    if (!cleanNewPassword) {
      setErrorMessage('Yeni şifre zorunludur.');
      return;
    }

    if (cleanNewPassword.length < 4) {
      setErrorMessage('Yeni şifre en az 4 karakter olmalıdır.');
      return;
    }

    if (cleanNewPassword !== cleanNewPasswordAgain) {
      setErrorMessage('Yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`${getLocalApiUrl()}/api/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: cleanCurrentPassword,
          newPassword: cleanNewPassword,
          newPasswordAgain: cleanNewPasswordAgain,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || 'Şifre değiştirilemedi.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordAgain('');
      setSuccessMessage('Admin şifresi başarıyla güncellendi.');
    } catch (error) {
      console.error('Admin şifresi değiştirilirken hata oluştu:', error);
      setErrorMessage(error.message || 'Admin şifresi güncellenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border border-charcoal-700 bg-charcoal-800/70 shadow-xl overflow-hidden">
        <div className="border-b border-charcoal-700 bg-charcoal-900/40 px-6 py-5">
          <h3 className="font-serif text-2xl text-gold-500">
            Admin Şifresi
          </h3>
          <p className="mt-1 text-sm text-cream-200/60">
            Tek admin giriş şifresini buradan değiştirebilirsiniz.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-cream-200">
              Mevcut Şifre
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                resetMessages();
              }}
              autoComplete="current-password"
              className="w-full rounded-md border border-charcoal-600 bg-ink-950 p-3 text-cream-100 outline-none transition-colors focus:border-gold-500"
              placeholder="Mevcut admin şifresi"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-cream-200">
                Yeni Şifre
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  resetMessages();
                }}
                autoComplete="new-password"
                className="w-full rounded-md border border-charcoal-600 bg-ink-950 p-3 text-cream-100 outline-none transition-colors focus:border-gold-500"
                placeholder="En az 4 karakter"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-cream-200">
                Yeni Şifre Tekrar
              </label>
              <input
                type="password"
                value={newPasswordAgain}
                onChange={(e) => {
                  setNewPasswordAgain(e.target.value);
                  resetMessages();
                }}
                autoComplete="new-password"
                className="w-full rounded-md border border-charcoal-600 bg-ink-950 p-3 text-cream-100 outline-none transition-colors focus:border-gold-500"
                placeholder="Yeni şifreyi tekrar girin"
              />
            </div>
          </div>

          {successMessage && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-gold-500 px-6 py-3 font-bold text-ink-950 shadow-md transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-charcoal-700 bg-charcoal-800/40 p-5 text-sm text-cream-200/70">
        <p className="font-medium text-cream-100">Not</p>
        <p className="mt-1">
          Şifre değişikliği lokal olarak <span className="text-gold-400">data/admin-settings.json</span> dosyasına kaydedilir.
          Yeni şifre bir sonraki admin girişinde geçerli olur.
        </p>
      </div>
    </div>
  );
}