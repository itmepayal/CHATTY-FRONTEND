import { useAuthStore } from "../store/useAuthStore";

export const useVisibleOnlineUsers = () =>
  useAuthStore((st) => st.onlineUsers);
