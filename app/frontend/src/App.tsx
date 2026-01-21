import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { UploadPage } from './pages/UploadPage';
import { ValidatePage } from './pages/ValidatePage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/magic" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="/upload" replace />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="validate" element={<ValidatePage />} />
                <Route path="cases" element={<CasesPage />} />
                <Route path="cases/:id" element={<CaseDetailPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="history" element={<ImportHistoryPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
