import {
  decryptFrom,
  decryptGroupText,
  getGroupLatestVersion,
  loadGroupKeys,
  whenE2EEReady,
} from "./e2ee.js";
import { useAuthStore } from "../store/useAuthStore.js";

export const getId = (x) => {
  if (!x) return "";
  if (typeof x === "object") return String(x._id || x.id || "");
  return String(x);
};

export const sameId = (a, b) => {
  const sa = getId(a);
  const sb = getId(b);
  return Boolean(sa && sb && sa === sb);
};

export const e2eeReady = async () => (await whenE2EEReady()) === "ready";

const ERR = {
  "peer-has-no-key":
    "This user hasn't set up encryption yet. Ask them to open the app once.",
  "e2ee-not-ready": "Encryption isn't ready yet. Please try again in a moment.",
  "group-not-encrypted": "This group has no encryption key yet.",
  "no-group-key": "You don't have this group's encryption key yet.",
};
export const e2eeErrMsg = (e) => ERR[e?.message] || null;

const needsDecrypt = (m) =>
  Boolean(
    m &&
    (m.encrypted || m.e2ee) &&
    m.iv &&
    !m.decrypted &&
    !m.isDeleted &&
    (m._cipher ?? m.text),
  );

const decryptWith = async (m, fn) => {
  const isEnc = Boolean(m?.encrypted || m?.e2ee);
  if (!needsDecrypt(m)) {
    return {
      ...m,
      cryptoState: isEnc
        ? m.decrypted
          ? "decrypted"
          : "plaintext"
        : "plaintext",
      decrypted: Boolean(m?.decrypted || !isEnc),
      decryptFailed: Boolean(m?.decryptFailed),
    };
  }
  const cipher = m._cipher ?? m.text;
  try {
    const text = await fn(cipher, m.iv);
    const { _cipher: _drop, ...rest } = m;
    return {
      ...rest,
      text,
      decrypted: true,
      decryptFailed: false,
      cryptoState: "decrypted",
      decryptError: null,
    };
  } catch (err) {
    console.error("[E2EE] Decryption error for message:", m._id || m.id, err);
    return {
      ...m,
      text: "",
      _cipher: cipher,
      decrypted: false,
      decryptFailed: true,
      cryptoState: "decryption_failed",
      decryptError: err?.message || "Decryption failed",
    };
  }
};

export const FAILED_TEXT = "🔒 Encrypted message";
export const displayText = (m, fallback = FAILED_TEXT) => {
  if (!m) return "";
  if (typeof m === "string") return m;
  if (m.decryptFailed || ((m.encrypted || m.e2ee) && !m.decrypted)) {
    switch (m.decryptError) {
      case "Sent before this device was added":
        return "🔒 Sent before this device was added";
      case "HISTORY_RESTORATION_REQUIRED":
        return "🔒 History restoration required";
      case "DEVICE_VERIFICATION_REQUIRED":
        return "🔒 Device verification required";
      case "KEY_TRANSFER_PENDING":
        return "🔒 Key transfer pending";
      case "RECOVERY_REQUIRED":
        return "🔒 Recovery required to view message";
      case "DECRYPTION_KEY_UNAVAILABLE":
        return "🔒 Decryption key unavailable";
      case "MESSAGE_DECRYPTION_FAILED":
        return "🔒 Message decryption failed";
      case "DEVICE_REVOKED":
        return "🔒 Device revoked";
      default:
        return fallback;
    }
  }
  return m.text ?? "";
};

export const getDisplayText = displayText;

export const dmPeerOf = (m, meId) => {
  if (!m) return "";
  const sId = getId(m.senderId);
  const rId = getId(m.receiverId);
  const myId = getId(
    meId ||
      useAuthStore?.getState?.()?.authUser?._id ||
      useAuthStore?.getState?.()?.authUser?.id
  );
  if (myId && sId === myId) return rId;
  return sId || rId;
};

export const decryptDmMessage = async (m, meId, fallbackPeer) => {
  if (!m) return m;
  const myId = getId(
    meId ||
      useAuthStore?.getState?.()?.authUser?._id ||
      useAuthStore?.getState?.()?.authUser?.id
  );
  const peer =
    (m.senderId != null && m.receiverId != null
      ? dmPeerOf(m, myId)
      : "") || getId(fallbackPeer);

  if (!peer) {
    return m;
  }

  const fn = async (cipher, iv) => {
    await whenE2EEReady();
    return decryptFrom(peer, cipher, iv, m);
  };
  let out = await decryptWith(m, fn);
  if (out.replyTo) {
    const replyFn = async (cipher, iv) => {
      await whenE2EEReady();
      return decryptFrom(peer, cipher, iv, out.replyTo);
    };
    out = { ...out, replyTo: await decryptWith(out.replyTo, replyFn) };
  }
  return out;
};

export const decryptDmList = (list, meId, fallbackPeer) =>
  Promise.all((list || []).map((m) => decryptDmMessage(m, meId, fallbackPeer)));

export const decryptDmPreview = (lm, peerId) =>
  lm && typeof lm === "object"
    ? decryptWith(lm, async (cipher, iv) => {
        await whenE2EEReady();
        return decryptFrom(getId(peerId), cipher, iv, lm);
      })
    : lm;

const groupFn = (groupId, keyVersion) => (cipher, iv) =>
  decryptGroupText(
    groupId,
    keyVersion ?? getGroupLatestVersion(groupId),
    cipher,
    iv,
  );

export const decryptGroupMessage = async (m, fallbackGroupId) => {
  if (!m) return m;
  const gid = getId(m.groupId || fallbackGroupId);
  if (!gid) return m;
  let out = await decryptWith(m, groupFn(gid, m.keyVersion));
  if (out.replyTo) {
    out = {
      ...out,
      replyTo: await decryptWith(
        out.replyTo,
        groupFn(gid, out.replyTo.keyVersion ?? m.keyVersion),
      ),
    };
  }
  return out;
};

const hasFailed = (m) => Boolean(m?.decryptFailed || m?.replyTo?.decryptFailed);

export const decryptGroupList = async (list, groupId) => {
  const gid = getId(groupId);
  let out = await Promise.all(
    (list || []).map((m) => decryptGroupMessage(m, gid))
  );
  if (out.some(hasFailed)) {
    if (gid) {
      await loadGroupKeys(gid, { force: true }).catch(() => {});
    }
    out = await Promise.all(
      out.map((m) => (hasFailed(m) ? decryptGroupMessage(m, gid) : m))
    );
  }
  return out;
};

export const decryptGroupPreview = (lm, groupId) => {
  const gid = getId(groupId);
  return lm && typeof lm === "object" && gid
    ? decryptWith(lm, groupFn(gid, lm.keyVersion))
    : lm;
};

export const decryptGroupEdit = async ({
  groupId,
  text,
  iv,
  keyVersion,
  encrypted,
}) => {
  const gid = getId(groupId);
  if (!encrypted || !iv || !gid) {
    return { text: text ?? "", decrypted: true, decryptFailed: false };
  }
  try {
    const plain = await groupFn(gid, keyVersion)(text, iv);
    return { text: plain, decrypted: true, decryptFailed: false };
  } catch (err) {
    console.error("[E2EE] Group edit decrypt failed:", gid, err);
    return { text: "", decrypted: false, decryptFailed: true };
  }
};
