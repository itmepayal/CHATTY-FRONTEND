import {
  decryptFrom,
  decryptGroupText,
  getGroupLatestVersion,
  loadGroupKeys,
  whenE2EEReady,
} from "./e2ee.js";

const sameId = (a, b) => String(a) === String(b);

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
    m.encrypted &&
    m.iv &&
    !m.decrypted &&
    !m.isDeleted &&
    (m._cipher ?? m.text),
  );

const decryptWith = async (m, fn) => {
  if (!needsDecrypt(m)) return m;
  const cipher = m._cipher ?? m.text;
  try {
    const text = await fn(cipher, m.iv);
    const { _cipher: _drop, ...rest } = m;
    return { ...rest, text, decrypted: true, decryptFailed: false };
  } catch {
    return { ...m, text: "", _cipher: cipher, decryptFailed: true };
  }
};

export const FAILED_TEXT = "🔒 Encrypted message";
export const displayText = (m, fallback = FAILED_TEXT) =>
  m?.decryptFailed ? fallback : (m?.text ?? "");

export const dmPeerOf = (m, meId) =>
  String(sameId(m.senderId, meId) ? m.receiverId : m.senderId);

export const decryptDmMessage = async (m, meId, fallbackPeer) => {
  if (!m) return m;
  const peer =
    m.senderId != null && m.receiverId != null
      ? dmPeerOf(m, meId)
      : String(fallbackPeer);
  const fn = async (cipher, iv) => {
    await whenE2EEReady();
    return decryptFrom(peer, cipher, iv);
  };
  let out = await decryptWith(m, fn);
  if (out.replyTo)
    out = { ...out, replyTo: await decryptWith(out.replyTo, fn) };
  return out;
};

export const decryptDmList = (list, meId, fallbackPeer) =>
  Promise.all((list || []).map((m) => decryptDmMessage(m, meId, fallbackPeer)));

export const decryptDmPreview = (lm, peerId) =>
  lm && typeof lm === "object"
    ? decryptWith(lm, async (cipher, iv) => {
        await whenE2EEReady();
        return decryptFrom(peerId, cipher, iv);
      })
    : lm;

const groupFn = (groupId, keyVersion) => (cipher, iv) =>
  decryptGroupText(
    groupId,
    keyVersion ?? getGroupLatestVersion(groupId),
    cipher,
    iv,
  );

export const decryptGroupMessage = async (m) => {
  if (!m) return m;
  let out = await decryptWith(m, groupFn(m.groupId, m.keyVersion));
  if (out.replyTo) {
    out = {
      ...out,
      replyTo: await decryptWith(
        out.replyTo,
        groupFn(m.groupId, out.replyTo.keyVersion ?? m.keyVersion),
      ),
    };
  }
  return out;
};

const hasFailed = (m) => Boolean(m?.decryptFailed || m?.replyTo?.decryptFailed);

export const decryptGroupList = async (list, groupId) => {
  let out = await Promise.all((list || []).map(decryptGroupMessage));
  if (out.some(hasFailed)) {
    await loadGroupKeys(groupId, { force: true }).catch(() => {});
    out = await Promise.all(
      out.map((m) => (hasFailed(m) ? decryptGroupMessage(m) : m)),
    );
  }
  return out;
};

export const decryptGroupPreview = (lm, groupId) =>
  lm && typeof lm === "object"
    ? decryptWith(lm, groupFn(groupId, lm.keyVersion))
    : lm;

export const decryptGroupEdit = async ({
  groupId,
  text,
  iv,
  keyVersion,
  encrypted,
}) => {
  if (!encrypted || !iv) {
    return { text: text ?? "", decrypted: true, decryptFailed: false };
  }
  try {
    const plain = await groupFn(groupId, keyVersion)(text, iv);
    return { text: plain, decrypted: true, decryptFailed: false };
  } catch {
    return { text: "", decrypted: false, decryptFailed: true };
  }
};
