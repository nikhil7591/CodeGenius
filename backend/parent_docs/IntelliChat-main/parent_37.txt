import { Navigate, Outlet, useLocation } from "react-router-dom"
import useUserStore from "./store/useUserStore";

export const ProtectedRoute = () => {
    const location = useLocation();
    const { isAuthenticated, isInitialized } = useUserStore();

    // Wait for initial auth check to complete
    if (!isInitialized) {
        return null; // LoadingScreen is shown in App.js
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/user-login" state={{ from: location }} replace />
    }

    // User is authenticated - render the protected component
    return <Outlet />
}

export const PublicRoute = () => {
    const { isAuthenticated, isInitialized } = useUserStore();

    // Wait for initial auth check to complete
    if (!isInitialized) {
        return null; // LoadingScreen is shown in App.js
    }

    // If already authenticated, redirect to home
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // User is not authenticated - show login page
    return <Outlet />
}