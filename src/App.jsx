import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { CustomToastContainer } from "./components/toast";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import UserProfileRoute from "./pages/UserProfileRoute";
import SavedMessagesPage from "./pages/SavedMessagesPage";
import { registerProtocolHandlerIfSupported } from "./utils/deepLink";

import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import ChattyLoader from "./components/common/ChattyLoader";

import { CallProvider } from "./context/CallContext";
import CallUI from "./components/Call/CallUI";

import useGroupCallListeners from "./hooks/useGroupCallListeners";
import GroupCallModal from "./components/group/common/GroupCallModal.jsx";
import IncomingGroupCall from "./components/group/common/IncomingGroupCall.jsx";

import LiveLocationSender from "./components/Location/LiveLocationSender.jsx";
import { useApplySettings } from "./hooks/useApplySettings.js";
import AppLockScreen from "./components/settings/privacy/AppLockScreen.jsx";
import { useAppLockStore } from "./store/useAppLockStore.js";
import { usePrivacyStore } from "./store/usePrivacyStore.js";
import { useChatLockStore } from "./store/useChatLockStore.js";
import { useNotificationStore } from "./store/useNotificationStore.js";

const AuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  // Validate safe internal redirect (must start with / and not //) to prevent open redirect vulnerabilities
  const safeRedirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/chat";

  return <Navigate to={safeRedirect} replace />;
};

const App = () => {
  useApplySettings();
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const socket = useAuthStore((s) => s.socket);
  const { pathname } = useLocation();

  useEffect(() => {
    registerProtocolHandlerIfSupported();
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "CHATTY_NOTIFICATION_CLICK") {
          const data = event.data.data || {};
          if (data.peerId) {
            useChatStore.getState().setSelectedUser({ _id: data.peerId });
          } else if (data.groupId) {
            useGroupStore.getState().selectGroup({ _id: data.groupId });
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const uid = authUser?._id ?? authUser?.id;
    if (uid) {
      useAppLockStore.getState().initAppLock(null, String(uid));
      usePrivacyStore.getState().fetchPrivacy?.();
    } else {
      useAppLockStore.getState().reset?.();
      useChatLockStore.getState().reset?.();
      usePrivacyStore.getState().resetPrivacy?.();
    }
  }, [authUser?._id, authUser?.id]);

  useEffect(() => {
    if (!socket || !authUser) return;
    useChatStore.getState().subscribeToMessage();
    useGroupStore.getState().subscribeToGroups();
    useNotificationStore.getState().bindSocketEvents(socket);
    useNotificationStore.getState().fetchUnreadCount();
    return () => {
      useChatStore.getState().unSubscribeFromMessage();
      useGroupStore.getState().unsubscribeFromGroups();
    };
  }, [socket, authUser]);

  useGroupCallListeners();

  const isAppLocked = useAppLockStore((s) => s.isLocked && s.isConfigured);
  const showNavbar = pathname === "/" || pathname === "/landing";

  if (isCheckingAuth && !authUser) {
    return <ChattyLoader />;
  }

  // Defensive DOM protection: If App Lock is active, render only the lock screen
  if (authUser && isAppLocked) {
    return (
      <div className="min-h-screen bg-base-100 text-base-content">
        <AppLockScreen />
        <CustomToastContainer position="top-right" />
      </div>
    );
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
            element={!authUser ? <LoginPage /> : <AuthRedirect />}
          />

          <Route
            path="/register"
            element={!authUser ? <RegisterPage /> : <AuthRedirect />}
          />

          <Route path="/user/:username" element={<UserProfileRoute />} />

          <Route path="/u/:username" element={<UserProfileRoute />} />

          <Route path="/profile/:username" element={<UserProfileRoute />} />

          <Route
            path="/chat"
            element={authUser ? <HomePage /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/saved"
            element={authUser ? <SavedMessagesPage /> : <Navigate to="/login" replace />}
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
            path="/settings/:section"
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

        <CustomToastContainer position="top-right" />

        {authUser && (
          <>
            <LiveLocationSender />
            <CallUI />
            <GroupCallModal />
            <IncomingGroupCall />
            <AppLockScreen />
          </>
        )}
      </div>
    </CallProvider>
  );
};

export default App;
