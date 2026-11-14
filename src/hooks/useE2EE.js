/**
 * React Hook for E2EE State Management
 * Connects React components with the centralized E2EEManager singleton.
 */

import { useState, useEffect, useCallback } from "react";
import { e2eeManager } from "../lib/e2ee/e2eeManager.js";
import { E2EE_STATUS } from "../lib/e2ee/e2ee.constants.js";
import { useAuthStore } from "../store/useAuthStore.js";

export function useE2EE() {
  const authUser = useAuthStore((state) => state.authUser);
  const userId = authUser?._id ?? authUser?.id;

  const [state, setState] = useState(() => ({
    status: e2eeManager.getStatus(),
    isReady: e2eeManager.getStatus() === E2EE_STATUS.READY,
    me: e2eeManager.me,
    serverStatus: e2eeManager.serverStatus,
  }));

  useEffect(() => {
    const unsubscribe = e2eeManager.subscribe((nextState) => {
      setState(nextState);
    });

    // If manager is not initialized or user changed, sync
    if (userId && e2eeManager.currentUserId !== String(userId)) {
      e2eeManager.init(userId);
    }

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const setup = useCallback(async (passphrase) => {
    return e2eeManager.setupIdentity(passphrase);
  }, []);

  const restore = useCallback(async (passphrase) => {
    return e2eeManager.restoreIdentity(passphrase);
  }, []);

  const changePassphrase = useCallback(async (oldPassphrase, newPassphrase) => {
    return e2eeManager.changePassphrase(oldPassphrase, newPassphrase);
  }, []);

  const resetIdentity = useCallback(async (password) => {
    return e2eeManager.resetIdentity(password);
  }, []);

  const refresh = useCallback(async () => {
    if (userId) {
      return e2eeManager.init(userId);
    }
  }, [userId]);

  const lock = useCallback(() => {
    e2eeManager.lock();
  }, []);

  const unlock = useCallback(async () => {
    return e2eeManager.unlock();
  }, []);

  return {
    ...state,
    isLoading:
      state.status === E2EE_STATUS.LOADING ||
      state.status === E2EE_STATUS.SETTING_UP ||
      state.status === E2EE_STATUS.RESTORING,
    isRestoreRequired: state.status === E2EE_STATUS.RESTORE_REQUIRED,
    isNotConfigured: state.status === E2EE_STATUS.NOT_CONFIGURED,
    isBackupMissing: state.status === E2EE_STATUS.BACKUP_MISSING,
    isMismatch: state.status === E2EE_STATUS.IDENTITY_MISMATCH,
    isLocked: state.status === E2EE_STATUS.LOCKED,
    isUnsupported: state.status === E2EE_STATUS.UNSUPPORTED,
    setup,
    restore,
    changePassphrase,
    resetIdentity,
    refresh,
    lock,
    unlock,
  };
}

export default useE2EE;
