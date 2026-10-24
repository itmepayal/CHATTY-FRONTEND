const canUseAsyncClipboard = () =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  Boolean(navigator.clipboard);

function legacyCopy(text) {
  const previouslyFocused = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(ta);

  let ok = false;
  try {
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(ta);
    previouslyFocused?.focus?.({ preventScroll: true });
  }
  return ok;
}

export async function copyMessageText(text) {
  if (!text) return false;

  if (canUseAsyncClipboard() && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  return legacyCopy(text);
}

function loadImage(src, { cors = false } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

function imageToPngBlob(img) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    try {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG conversion failed"))),
        "image/png",
      );
    } catch (e) {
      reject(e);
    }
  });
}

async function blobToPng(blob) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    return await imageToPngBlob(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchAsPngBlob(url) {
  try {
    const res = await fetch(url, { mode: "cors", cache: "reload" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return blob.type === "image/png" ? blob : await blobToPng(blob);
  } catch {
    const img = await loadImage(url, { cors: true });
    return imageToPngBlob(img);
  }
}

export async function copyMessageImage(imageUrl) {
  if (!imageUrl) return false;

  const canCopyImage =
    canUseAsyncClipboard() &&
    typeof navigator.clipboard.write === "function" &&
    typeof window.ClipboardItem !== "undefined";

  if (canCopyImage) {
    try {
      const item = new window.ClipboardItem({
        "image/png": fetchAsPngBlob(imageUrl),
      });
      await navigator.clipboard.write([item]);
      return "image";
    } catch (err) {
      console.warn("Image copy failed, falling back to link:", err);
    }
  }

  return (await copyMessageText(imageUrl)) ? "url" : false;
}

export async function copyImageLink(imageUrl) {
  return copyMessageText(imageUrl);
}
