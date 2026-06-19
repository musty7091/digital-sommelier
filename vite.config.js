import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Dışarıdan gelen bağlantılara izin verdiğimiz bölüm
    allowedHosts: [
      'ccbb-93-182-73-229.ngrok-free.app', // Sizin mevcut linkiniz
      '.ngrok-free.app'                    // İleride link değişirse otomatik kabul etmesi için
    ]
  }
});