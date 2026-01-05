import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import ProductsPage from "@/pages/ProductsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import ForecastingPage from "@/pages/ForecastingPage";
import PurchaseOrdersPage from "@/pages/PurchaseOrdersPage";
import AlertsPage from "@/pages/AlertsPage";
import VendorsPage from "@/pages/VendorsPage";
import AuditLogsPage from "@/pages/AuditLogsPage";
import SettingsPage from "@/pages/SettingsPage";
import UserManagementPage from "@/pages/UserManagementPage";
import StockRequestsPage from "@/pages/StockRequestsPage";
import ReportsPage from "@/pages/ReportsPage";
import AutoRestockPage from "@/pages/AutoRestockPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/forecasting" element={<ForecastingPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/stock-requests" element={<StockRequestsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/auto-restock" element={<AutoRestockPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
