import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import PrivateRoutes   from './PrivateRoutes';
import Login           from '../pages/Login';
import Dashboard       from '../pages/Dashboard';

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<PrivateRoutes />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
