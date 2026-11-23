import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppFrame from "@/components/AppFrame.jsx";
import HomeLayout from "@/components/HomeLayout.jsx";
import { getAppSettings } from "@/lib/appSettings.js";
import { useAuth } from "@/lib/auth.jsx";
import { getAdminUrl, isAdminSite } from "@/lib/sites.js";
import AdminPage from "@/pages/AdminPage.jsx";
import AppInfoPage from "@/pages/AppInfoPage.jsx";
import CatalogPage from "@/pages/CatalogPage.jsx";
import CategoriesPage from "@/pages/CategoriesPage.jsx";
import FavoritesPage from "@/pages/FavoritesPage.jsx";
import InstallAppPage from "@/pages/InstallAppPage.jsx";
import LoginPage from "@/pages/LoginPage.jsx";
import LandingPage from "@/pages/LandingPage.jsx";
import MissingPreviewsPage from "@/pages/MissingPreviewsPage.jsx";
import PreviewsPage from "@/pages/PreviewsPage.jsx";
import ProductLandingPage from "@/pages/ProductLandingPage.jsx";
import RegisterPage from "@/pages/RegisterPage.jsx";
import SettingsPage from "@/pages/SettingsPage.jsx";
import SongFormPage from "@/pages/SongFormPage.jsx";
import SongThemeAddPage from "@/pages/SongThemeAddPage.jsx";
import SongThemePage from "@/pages/SongThemePage.jsx";
import SongThemesPage from "@/pages/SongThemesPage.jsx";
import SongPage from "@/pages/SongPage.jsx";
import UserDashboardPage from "@/pages/UserDashboardPage.jsx";

export default function App() {
  const { user, loading } = useAuth();
  const canManage = user?.role === "admin";
  const appSettings = getAppSettings();
  const canOpenMenu = (key) => canManage || appSettings.menuAccess[key];
  const canOpenSongThemes = canManage || appSettings.songThemesEnabled;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/inicio";
  const isLocalPanelRoute =
    pathname === "/admin" &&
    (import.meta.env.DEV ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isAdminSite() || isLocalPanelRoute) {
    return (
      <div className="h-dvh w-full overflow-hidden bg-paper text-ink">
        <AdminPage />
      </div>
    );
  }

  if (pathname === "/admin") return <RedirectToAdminSite />;
  if (loading && !isPublicPath) {
    return (
      <AppFrame>
        <AuthLoading />
      </AppFrame>
    );
  }
  if (!user && !isPublicPath) {
    return <Navigate to="/login" replace state={{ from: { pathname } }} />;
  }
  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    return user.role === "admin" ? (
      <RedirectToAdminSite />
    ) : (
      <Navigate to="/conta" replace />
    );
  }
  if (pathname === "/") return <ProductLandingPage user={user} />;
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/cadastro") return <RegisterPage />;
  if (pathname === "/conta") {
    return user?.role === "admin" ? (
      <RedirectToAdminSite />
    ) : (
      <UserDashboardPage user={user} />
    );
  }
  if (pathname === "/inicio") {
    return (
      <AppFrame>
        <LandingPage onEnterWeb={() => navigate("/app", { replace: true })} />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <Routes>
        <Route element={<HomeLayout />}>
          <Route path="/app" element={<CatalogPage />} />
          <Route path="/mais" element={<CategoriesPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route
            path="/favoritos"
            element={canOpenMenu("favorites") ? <FavoritesPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/previsualizacao"
            element={canOpenMenu("previews") ? <PreviewsPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/admin/previews"
            element={
              loading ? (
                <AuthLoading />
              ) : canManage ? (
                <MissingPreviewsPage />
              ) : (
                <Navigate to="/app" replace />
              )
            }
          />
          <Route
            path="/instalar"
            element={canOpenMenu("install") ? <InstallAppPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/sobre"
            element={canOpenMenu("about") ? <AppInfoPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/configuracoes"
            element={canOpenMenu("settings") ? <SettingsPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/temas"
            element={canOpenSongThemes ? <SongThemesPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/temas/:themeId/adicionar"
            element={canOpenSongThemes ? <SongThemeAddPage /> : <Navigate to="/app" replace />}
          />
          <Route
            path="/temas/:themeId"
            element={canOpenSongThemes ? <SongThemePage /> : <Navigate to="/app" replace />}
          />
          <Route path="*" element={<CatalogPage />} />
        </Route>
        <Route
          path="/musicas/nova"
          element={
            loading ? (
              <AuthLoading />
            ) : canManage ? (
              <RedirectToNewSongWizard />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />
        <Route
          path="/musicas/:id/editar"
          element={
            loading ? (
              <AuthLoading />
            ) : canManage ? (
              <SongFormPage />
            ) : (
              <Navigate to="/app" replace />
            )
          }
        />
        <Route path="/musicas/:id" element={<SongPage />} />
      </Routes>
    </AppFrame>
  );
}

function AuthLoading() {
  return <p className="p-6 text-center text-sm text-ink-soft">Verificando acesso…</p>;
}

function RedirectToAdminSite() {
  useEffect(() => {
    window.location.replace(getAdminUrl());
  }, []);
  return null;
}

function RedirectToNewSongWizard() {
  useEffect(() => {
    const url = new URL(getAdminUrl(), window.location.origin);
    url.searchParams.set("nova", "1");
    window.location.replace(url.href);
  }, []);
  return null;
}
