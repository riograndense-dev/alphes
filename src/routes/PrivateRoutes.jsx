import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoutes() {
    const { user, authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 bg-[#F59E0B] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                        <span className="text-[#1E3A5F] font-black text-2xl">A</span>
                    </div>
                    <svg className="w-6 h-6 animate-spin text-white mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
