import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";

import { useAuthStore } from "./store/useAuthStore";
import ChattyLoader from "./components/common/ChattyLoader";

import { CallProvider } from "./context/CallContext";
import CallUI from "./components/Call/CallUI";

// group calls
import useGroupCallListeners from "./hooks/useGroupCallListeners";
import GroupCallModal from "./components/group/common/GroupCallModal.jsx";
import IncomingGroupCall from "./components/group/common/IncomingGroupCall.jsx";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const socket = useAuthStore((s) => s.socket);
  const { pathname } = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useGroupCallListeners();

  const showNavbar = pathname === "/" || pathname === "/landing";

  if (isCheckingAuth && !authUser) {
    return <ChattyLoader />;
  }

  return (
    <CallProvider socket={socket}>
      <div className="min-h-screen bg-base-100 text-base-content">
        {showNavbar && <Navbar />}

        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/landing" element={<LandingPage />} />

          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/" replace />}
          />

          <Route
            path="/register"
            element={!authUser ? <RegisterPage /> : <Navigate to="/" replace />}
          />

          <Route
            path="/chat"
            element={authUser ? <HomePage /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/profile"
            element={
              authUser ? <ProfilePage /> : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/settings"
            element={
              authUser ? <SettingsPage /> : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/forgot-password"
            element={
              !authUser ? <ForgotPasswordPage /> : <Navigate to="/" replace />
            }
          />

          <Route
            path="/reset-password/:token"
            element={
              !authUser ? <ResetPasswordPage /> : <Navigate to="/" replace />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster position="top-center" reverseOrder={false} />

        {authUser && (
          <>
            <CallUI />
            <GroupCallModal />
            <IncomingGroupCall />
          </>
        )}
      </div>
    </CallProvider>
  );
};

export default App;
