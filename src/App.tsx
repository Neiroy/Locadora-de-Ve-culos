import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import { useBranding } from "./hooks/useBranding";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CarsPage } from "./pages/CarsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { RentalsPage } from "./pages/RentalsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { ContractViewPage } from "./pages/ContractViewPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useEffect } from "react";

const BrandingMeta = () => {
  const { logoUrl } = useBranding();

  useEffect(() => {
    const iconHref = logoUrl || "/favicon.svg";
    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }

    favicon.setAttribute("href", iconHref);
  }, [logoUrl]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <BrandingMeta />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="carros" element={<CarsPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="locacoes" element={<RentalsPage />} />
            <Route path="contratos" element={<ContractsPage />} />
            <Route path="contratos/:id" element={<ContractViewPage />} />
            <Route path="historicos" element={<ReportsPage />} />
            <Route path="históricos" element={<Navigate to="/relatorios" replace />} />
            <Route path="relatórios" element={<Navigate to="/relatorios" replace />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#0f172a",
            fontSize: "14px",
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
