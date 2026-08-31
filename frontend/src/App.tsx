/**
 * Route map of the application.
 *
 * Routing is declarative (ADR 0005): every route is declared here rather than
 * in a route object tree, which keeps the whole navigable surface readable in
 * one place. Pages are imported eagerly — there is no per-route code splitting
 * yet, because the bundle does not warrant it.
 */
import { Route, Routes } from 'react-router'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { Disclaimer } from './pages/public/Disclaimer'
import { Info } from './pages/public/Info'
import { Landing } from './pages/public/Landing'
import { Login } from './pages/public/Login'
import { Register } from './pages/public/Register'
import { Catalog } from './pages/app/Catalog'
import { CatalogContribute } from './pages/app/CatalogContribute'
import { CatalogRequest } from './pages/app/CatalogRequest'
import { Dashboard } from './pages/app/Dashboard'
import { Settings } from './pages/app/Settings'
import { VehicleDetail } from './pages/app/VehicleDetail'
import { VehicleForm } from './pages/app/VehicleForm'
import { VehicleList } from './pages/app/VehicleList'
import { NotFound } from './pages/NotFound'

/**
 * Declares the two route branches: public pages under `PublicLayout` and the
 * signed-in area under `AppLayout`.
 *
 * URL segments are in Italian because they are user-facing, matching the
 * interface language.
 *
 * The app branch sits behind `ProtectedRoute`: without a session it redirects
 * to the login page, carrying where it was going so the user comes back there
 * (ADR 0009).
 */
function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="disclaimer" element={<Disclaimer />} />
        <Route path="info" element={<Info />} />

        {/* The catch-all lives in the public branch: an unknown URL comes from
            someone who is not navigating the app, so answering it with the
            signed-in chrome would imply a session that may not exist. */}
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="veicoli">
            <Route index element={<VehicleList />} />
            {/* The static `nuovo` segment takes precedence over `:id`, so the
                create form is never mistaken for a vehicle whose id is "nuovo". */}
            <Route path="nuovo" element={<VehicleForm mode="create" />} />
            <Route path=":id" element={<VehicleDetail />} />
            <Route path=":id/modifica" element={<VehicleForm mode="edit" />} />
          </Route>

          <Route path="catalogo">
            <Route index element={<Catalog />} />
            <Route path="richiedi" element={<CatalogRequest />} />
            <Route path="contribuisci" element={<CatalogContribute />} />
          </Route>

          <Route path="impostazioni" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
