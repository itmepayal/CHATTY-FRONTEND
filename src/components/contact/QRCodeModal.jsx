import { useState, useEffect, useMemo } from "react";
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from "../chat-ui";
import { QrCode, Copy, Check, Download, Loader2, CheckCircle2 } from "lucide-react";
import { customToast as toast } from "../toast";
import { useContactStore } from "../../store/useContactStore";
import { getShareableProfileUrl } from "../../utils/deepLink";

export const QRCodeModal = ({ open, onClose, user }) => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fetchUserQRCode = useContactStore((s) => s.fetchUserQRCode);

  const userId = user?.id || user?._id;
  const displayName = user?.fullName || user?.name || "Chatty User";
  const username = user?.username;

  const avatarSrc = useMemo(() => {
    if (!user?.avatar && !user?.profilePic) return null;
    return typeof user.avatar === "string"
      ? user.avatar
      : user.avatar?.url || user.profilePic || null;
  }, [user?.avatar, user?.profilePic]);

  const initials = useMemo(() => {
    return (displayName || "U")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName]);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetchUserQRCode(userId)
      .then((data) => {
        if (data?.qrCode) {
          setQrCodeData(data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [open, userId, fetchUserQRCode]);

  const handleCopy = () => {
    const targetIdentifier = username || userId;
    const link =
      qrCodeData?.shareUrl || getShareableProfileUrl(targetIdentifier);
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Profile link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrCodeData?.qrCode) return;
    const a = document.createElement("a");
    a.href = qrCodeData.qrCode;
    a.download = `${username || "chatty"}-qr.png`;
    a.click();
    toast.success("QR code downloaded");
  };

  return (
    <ModalLayout
      open={open}
      onClose={onClose}
      size="qr"
      centered={true}
      className="w-full"
    >
      <ModalHeader
        icon={QrCode}
        title="Profile QR Code"
        subtitle="Scan to connect and message on Chatty"
        onClose={onClose}
      />
      <ModalBody className="p-4 sm:p-5 flex flex-col items-center text-center space-y-3.5 sm:space-y-4 overflow-y-auto overscroll-contain">
        {/* Profile Identity Card connected to QR */}
        <div className="w-full flex items-center gap-3 bg-base-200/50 p-2.5 sm:p-3 rounded-2xl border border-base-300/60 text-left">
          <div className="relative shrink-0">
            <div className="size-10 sm:size-11 rounded-full overflow-hidden bg-base-300 ring-2 ring-primary/20 flex items-center justify-center">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div
                className={`size-full flex items-center justify-center font-bold text-xs sm:text-sm bg-gradient-to-tr from-primary/25 to-accent/25 text-primary ${
                  avatarSrc ? "hidden" : "flex"
                }`}
              >
                {initials}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm sm:text-base text-base-content truncate">
                {displayName}
              </h3>
              {user?.isVerified && (
                <CheckCircle2
                  className="size-3.5 text-primary shrink-0"
                  title="Verified Account"
                />
              )}
            </div>
            {username ? (
              <p className="text-xs font-semibold text-primary truncate mt-0.5">
                @{username}
              </p>
            ) : (
              <p className="text-[11px] text-base-content/50 truncate mt-0.5">
                Chatty Member
              </p>
            )}
          </div>
        </div>

        {/* QR Code Container with dedicated quiet-zone */}
        <div className="w-full flex flex-col items-center justify-center">
          <div className="relative p-3 sm:p-3.5 bg-white rounded-2xl sm:rounded-3xl shadow-md border border-base-200/80 ring-4 ring-primary/5 flex items-center justify-center transition-all hover:shadow-lg">
            {isLoading ? (
              <div className="size-40 sm:size-48 flex flex-col items-center justify-center gap-2 text-base-content/50">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-xs font-medium">Generating QR...</span>
              </div>
            ) : qrCodeData?.qrCode ? (
              <div className="relative flex items-center justify-center">
                <img
                  src={qrCodeData.qrCode}
                  alt={`${displayName}'s Profile QR Code`}
                  className="size-40 sm:size-48 object-contain rounded-xl select-none"
                />
                {/* Center Avatar Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-8 sm:size-9 rounded-full bg-white p-0.5 shadow-md ring-2 ring-primary/30 flex items-center justify-center overflow-hidden">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt=""
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-full rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[11px]">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="size-40 sm:size-48 flex flex-col items-center justify-center text-xs text-base-content/60 gap-1.5 p-4 text-center">
                <QrCode className="size-8 text-base-content/30" />
                <span>Failed to load QR code</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructional Text */}
        <p className="text-xs text-base-content/60 text-center leading-relaxed max-w-[270px]">
          Scan this QR code with any camera or Chatty scanner to connect directly.
        </p>
      </ModalBody>

      {/* Action Buttons */}
      <ModalFooter className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
          <button
            type="button"
            disabled={isLoading || !qrCodeData?.qrCode}
            onClick={handleCopy}
            className="btn btn-outline border-base-300 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all text-xs sm:text-sm font-semibold h-10 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 w-full cursor-pointer disabled:opacity-40"
          >
            {copied ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4 text-base-content/70" />
            )}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>

          <button
            type="button"
            disabled={isLoading || !qrCodeData?.qrCode}
            onClick={handleDownload}
            className="btn btn-primary text-primary-content transition-all shadow-sm hover:shadow text-xs sm:text-sm font-semibold h-10 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 w-full cursor-pointer disabled:opacity-40"
          >
            <Download className="size-4" />
            <span>Save Image</span>
          </button>
        </div>
      </ModalFooter>
    </ModalLayout>
  );
};

export default QRCodeModal;
