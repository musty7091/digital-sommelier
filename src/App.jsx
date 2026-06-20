import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import KioskApp from './kiosk/KioskApp.jsx'
import AdminApp from './admin/AdminApp.jsx'
import AdminGuard from './admin/AdminGuard';

// Kiosk ana public yuzeydir; kok adres kiosk'a yonlenir.
// Guvenlik: kiosk ekraninda admin'e gecis baglantisi YOKTUR (dokuman 14.3).
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/kiosk" replace /> },
  { path: '/kiosk', element: <KioskApp /> },
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminApp />
      </AdminGuard>
    ),
  },
  { path: '*', element: <Navigate to="/kiosk" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
