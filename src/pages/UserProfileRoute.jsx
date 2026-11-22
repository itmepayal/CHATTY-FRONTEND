import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useContactStore } from "../store/useContactStore";
import ProfileCardModal from "../components/contact/ProfileCardModal";
import HomePage from "./HomePage";
import ChattyLoader from "../components/common/ChattyLoader";
import { customToast as toast } from "../components/toast";
import { parseDeepLink } from "../utils/deepLink";

/**
 * UserProfileRoute
 * Dedicated route handler for /user/:username, /u/:username, and /profile/:username.
 * Supports direct browser navigation, deep linking, page refresh, and unauthenticated redirects.
 */
const UserProfileRoute = () => {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { authUser, isCheckingAuth } = useAuthStore();
  const resolveQRPayload = useContactStore((s) => s.resolveQRPayload);

  const [resolvedUser, setResolvedUser] = useState(null);
  const [isResolving, setIsResolving] = useState(true);

  // 1. Resolve profile data for the authenticated user
  useEffect(() => {
    if (isCheckingAuth || !authUser) return;

    if (!username) {
      toast.error("Invalid user profile link.");
      navigate("/chat", { replace: true });
      return;
    }

    // Extract identifier from raw param or deep link
    const parsed = parseDeepLink(username);
    const identifier = parsed?.identifier || username.replace(/^@/, "").trim();

    if (!identifier) {
      toast.error("Invalid user profile link.");
      navigate("/chat", { replace: true });
      return;
    }

    const myId = String(authUser?._id || authUser?.id || "");
    const myUsername = authUser?.username ? String(authUser.username).toLowerCase() : "";
    const isMe =
      identifier === myId ||
      (myUsername && identifier.toLowerCase() === myUsername);

    if (isMe) {
      setResolvedUser(authUser);
      setIsResolving(false);
      return;
    }

    let isMounted = true;
    setIsResolving(true);

    resolveQRPayload(identifier)
      .then((data) => {
        if (!isMounted) return;
        if (data?.user) {
          setResolvedUser(data.user);
        } else {
          toast.error("User not found or profile is unavailable.");
          navigate("/chat", { replace: true });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("[UserProfileRoute] Error resolving user profile:", err);
        toast.error("User not found or profile is unavailable.");
        navigate("/chat", { replace: true });
      })
      .finally(() => {
        if (isMounted) setIsResolving(false);
      });

    return () => {
      isMounted = false;
    };
  }, [username, authUser, isCheckingAuth, resolveQRPayload, navigate]);

  // 2. If auth is still resolving on refresh or initial load, show branded loader
  if (isCheckingAuth) {
    return <ChattyLoader />;
  }

  // 3. If not authenticated, preserve requested destination and redirect to login
  if (!authUser) {
    const target = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(target)}`}
        replace
      />
    );
  }

  const handleCloseModal = () => {
    setResolvedUser(null);
    navigate("/chat", { replace: true });
  };

  if (isResolving && !resolvedUser) {
    return <ChattyLoader />;
  }

  return (
    <>
      <HomePage />
      {resolvedUser && (
        <ProfileCardModal
          open={Boolean(resolvedUser)}
          onClose={handleCloseModal}
          user={resolvedUser}
        />
      )}
    </>
  );
};

export default UserProfileRoute;
