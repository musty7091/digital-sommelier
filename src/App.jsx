import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AdminGuard from './admin/AdminGuard'

// Kiosk ve admin ayrı parçalar olarak tembel yüklenir (kiosk başlangıcı hafifler,
// admin kodu ve three.js kiosk paketine girmez).
const KioskApp = lazy(() => import('./kiosk/KioskApp.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#160d0e',
        color: '#e8d9b5',
        fontFamily: 'serif',
        letterSpacing: '0.1em',
      }}
    >
      Yükleniyor…
    </div>
  )
}

// Kiosk ana public yuzeydir; kok adres kiosk'a yonlenir.
// Guvenlik: kiosk ekraninda admin'e gecis baglantisi YOKTUR (dokuman 14.3).
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/kiosk" replace /> },
  {
    path: '/kiosk',
    element: (
      <Suspense fallback={<Loading />}>
        <KioskApp />
      </Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <Suspense fallback={<Loading />}>
          <AdminApp />
        </Suspense>
      </AdminGuard>
    ),
  },
  { path: '*', element: <Navigate to="/kiosk" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
