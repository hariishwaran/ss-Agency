import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { NotificationProvider } from './context/NotificationContext';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Owners = lazy(() => import('./pages/Owners'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const SiteDetails = lazy(() => import('./pages/SiteDetails'));
const Ledger = lazy(() => import('./pages/Ledger'));
const FlexPrinting = lazy(() => import('./pages/FlexPrinting'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AuthPage = lazy(() => import('./pages/AuthPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <SearchProvider>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />

                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="owners" element={<Owners />} />
                  <Route path="campaigns" element={<Campaigns />} />
                  <Route path="campaigns/:id" element={<CampaignDetails />} />
                  <Route path="details/:id" element={<SiteDetails />} />
                  <Route path="details" element={<Navigate to="/details/1" replace />} />
                  <Route path="ledger" element={<Ledger />} />
                  <Route path="flex-printing" element={<FlexPrinting />} />
                  <Route path="notifications" element={<Notifications />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </SearchProvider>
  );
}
