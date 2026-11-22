import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
} from "../chat-ui";
import {
  User,
  MessageCircle,
  Phone,
  Video,
  QrCode,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Users,
  Smartphone,
  Calendar,
  Ban,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  Lock,
  X,
  Quote,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useContactStore } from "../../store/useContactStore";
import { useChatStore } from "../../store/useChatStore";
import { useCall } from "../../context/CallContext";
import { customToast as toast } from "../toast";
import QRCodeModal from "./QRCodeModal";
import ReportUserModal from "./ReportUserModal";
import BadgePill from "../badges/BadgePill.jsx";

export const ProfileCardModal = ({ open, onClose, user }) => {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [mutualContacts, setMutualContacts] = useState([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { authUser, onlineUsers, blockUser, unblockUser } = useAuthStore();
  const {
    contacts,
    requests,
    sendContactRequest,
    acceptContactRequest,
    rejectContactRequest,
    cancelContactRequest,
    requestActionLoading,
    fetchRequests,
    fetchMutualContacts,
  } = useContactStore();
  const { setSelectedUser } = useChatStore();
  const { startCall } = useCall();

  const userId = user?.id || user?._id;
  const isMe = String(userId) === String(authUser?.id || authUser?._id);
  const isOnline = onlineUsers.some((id) => String(id) === String(userId));
  const isContact = contacts.some(
    (c) => String(c.id || c._id) === String(userId),
  );
  const isBlocked = (authUser?.blockedUsers || []).some(
    (id) => String(id) === String(userId),
  );

  // Fetch requests & mutual contacts when modal opens
  useEffect(() => {
    if (!open || !userId) return;
    fetchRequests();
    if (!isMe) {
      fetchMutualContacts(userId).then(setMutualContacts);
    }
  }, [open, userId, isMe, fetchRequests, fetchMutualContacts]);

  // Find incoming & outgoing requests for this specific user
  const incomingReq = useMemo(() => {
    if (!userId || isContact) return null;
    return (requests.incoming || []).find((r) => {
      const sId = r.sender?._id || r.sender?.id || r.senderId || r.sender;
      return String(sId) === String(userId);
    });
  }, [requests.incoming, userId, isContact]);

  const outgoingReq = useMemo(() => {
    if (!userId || isContact) return null;
    return (requests.outgoing || []).find((r) => {
      const rId =
        r.recipient?._id || r.recipient?.id || r.recipientId || r.recipient;
      return String(rId) === String(userId);
    });
  }, [requests.outgoing, userId, isContact]);

  // Determine Relationship State (States A - F)
  // State A: NOT_CONNECTED
  // State B: OUTGOING_PENDING
  // State C: INCOMING_PENDING
  // State D: ACCEPTED
  // State F: BLOCKED
  const relationshipState = useMemo(() => {
    if (isBlocked) return "BLOCKED";
    if (isContact) return "ACCEPTED";
    if (incomingReq) return "INCOMING_PENDING";
    if (outgoingReq) return "OUTGOING_PENDING";
    return "NOT_CONNECTED";
  }, [isBlocked, isContact, incomingReq, outgoingReq]);

  // Formatted join date
  const memberSince = useMemo(() => {
    if (!user?.createdAt) return null;
    try {
      const d = new Date(user.createdAt);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return null;
    }
  }, [user?.createdAt]);

  const handleStartChat = () => {
    if (relationshipState !== "ACCEPTED") {
      toast.error("You must become contacts before sending messages.");
      return;
    }
    setSelectedUser(user);
    onClose?.();
  };

  const handleCall = (type = "audio") => {
    if (relationshipState !== "ACCEPTED") {
      toast.error("You must become contacts before calling.");
      return;
    }
    startCall(userId, type);
    onClose?.();
  };

  const handleSendRequest = async () => {
    setIsActionLoading(true);
    try {
      await sendContactRequest(userId);
    } finally {
      setIsActionLoading(false);
    }
  };

  const incomingReqId =
    incomingReq?.id || incomingReq?._id || incomingReq?.requestId;
  const isAccepting = Boolean(
    incomingReqId && requestActionLoading?.[incomingReqId] === "accepting",
  );
  const isDeclining = Boolean(
    incomingReqId && requestActionLoading?.[incomingReqId] === "declining",
  );
  const isIncomingBusy = isAccepting || isDeclining || isActionLoading;

  const outgoingReqId =
    outgoingReq?.id || outgoingReq?._id || outgoingReq?.requestId;
  const isCancelling = Boolean(
    outgoingReqId && requestActionLoading?.[outgoingReqId] === "cancelling",
  );

  const handleAcceptRequest = async () => {
    if (!incomingReqId) return;
    await acceptContactRequest(incomingReqId);
  };

  const handleDeclineRequest = async () => {
    if (!incomingReqId) return;
    await rejectContactRequest(incomingReqId);
  };

  const handleCancelRequest = async () => {
    if (!outgoingReqId) return;
    await cancelContactRequest(outgoingReqId);
  };

  const handleToggleBlock = async () => {
    setIsActionLoading(true);
    try {
      if (isBlocked) {
        await unblockUser(userId);
        toast.success("User unblocked");
      } else {
        await blockUser(userId);
        toast.success("User blocked");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <ModalLayout open={open} onClose={onClose} size="sm">
        <ModalHeader
          icon={User}
          title="User Profile"
          subtitle={user?.username ? `@${user.username}` : "Profile details"}
          onClose={onClose}
        />
        <ModalBody className="p-0 overflow-y-auto overflow-x-hidden bg-base-100">
          {/* Cover Header Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/30 via-indigo-600/20 to-purple-600/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-base-100/40" />
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={() => setShowQR(true)}
                title="View QR Code"
                className="size-8.5 rounded-full bg-base-100/80 hover:bg-base-100 backdrop-blur-md flex items-center justify-center text-base-content/75 hover:text-primary transition-all shadow-sm border border-base-300/40"
              >
                <QrCode className="size-4" />
              </button>
            </div>
          </div>

          {/* Profile Identity & Details */}
          <div className="px-5 pb-5 -mt-14 flex flex-col items-center text-center relative z-20">
            {/* Avatar with Status Ring */}
            <div className="relative mb-3">
              <div className="size-24 sm:size-26 rounded-full ring-4 ring-base-100 shadow-2xl overflow-hidden bg-base-300 transition-transform">
                {user?.avatar?.url || user?.profilePic || user?.avatar ? (
                  <img
                    src={
                      typeof user.avatar === "string"
                        ? user.avatar
                        : user.avatar?.url || user.profilePic
                    }
                    alt={user.fullName || "User"}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-gradient-to-tr from-primary/25 to-accent/25 text-primary font-bold text-3xl">
                    {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <span
                className={`absolute bottom-1 right-1 size-4 rounded-full ring-2 ring-base-100 shadow-sm ${
                  isOnline ? "bg-success" : "bg-base-content/30"
                }`}
                title={isOnline ? "Online" : "Offline"}
              />
            </div>

            {/* Name, Verified Badge & Username */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h3 className="text-xl font-bold text-base-content tracking-tight">
                {user?.fullName || "User"}
              </h3>
              {user?.featuredBadge && (
                <BadgePill badge={user.featuredBadge} size="sm" />
              )}
              {user?.isVerified && (
                <CheckCircle2
                  className="size-4.5 text-primary shrink-0"
                  title="Verified Account"
                />
              )}
            </div>

            {user?.username && (
              <p className="text-xs font-semibold text-primary/80 mt-0.5">
                @{user.username}
              </p>
            )}

            {/* Bio */}
            {user?.bio ? (
              <div className="mt-2.5 max-w-xs relative bg-base-200/40 px-3.5 py-2 rounded-xl border border-base-300/40 text-left">
                <p className="text-xs text-base-content/80 italic leading-relaxed line-clamp-3">
                  "{user.bio}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-base-content/40 italic mt-2">
                No bio available
              </p>
            )}

            {/* Status Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3.5">
              {/* Online indicator */}
              <span className="badge badge-sm badge-outline gap-1 text-[11px] py-2 border-base-300">
                <span
                  className={`size-1.5 rounded-full ${
                    isOnline ? "bg-success animate-pulse" : "bg-base-content/40"
                  }`}
                />
                {isOnline ? "Active now" : "Offline"}
              </span>

              {/* Relationship State Badge */}
              {relationshipState === "ACCEPTED" && (
                <span className="badge badge-sm badge-success gap-1 text-[11px] py-2 text-success-content font-medium">
                  <UserCheck className="size-3" /> Connected Contact
                </span>
              )}
              {relationshipState === "INCOMING_PENDING" && (
                <span className="badge badge-sm badge-info gap-1 text-[11px] py-2 text-info-content font-medium">
                  <UserPlus className="size-3" /> Incoming Request
                </span>
              )}
              {relationshipState === "OUTGOING_PENDING" && (
                <span className="badge badge-sm badge-warning gap-1 text-[11px] py-2 text-warning-content font-medium">
                  <Clock className="size-3" /> Request Sent
                </span>
              )}
              {relationshipState === "NOT_CONNECTED" && !isMe && (
                <span className="badge badge-sm badge-ghost gap-1 text-[11px] py-2 text-base-content/70">
                  <User className="size-3" /> Not in Contacts
                </span>
              )}
              {relationshipState === "BLOCKED" && (
                <span className="badge badge-sm badge-error gap-1 text-[11px] py-2 text-error-content font-medium">
                  <Ban className="size-3" /> Blocked
                </span>
              )}

              {/* Mutual Contacts Count */}
              {mutualContacts.length > 0 && (
                <span className="badge badge-sm badge-primary badge-outline gap-1 text-[11px] py-2">
                  <Users className="size-3" /> {mutualContacts.length} mutual
                </span>
              )}
            </div>

            {/* Relationship Explanatory Notice */}
            {!isMe && (
              <div className="w-full mt-3.5">
                {relationshipState === "NOT_CONNECTED" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-base-200/60 border border-base-300 text-xs text-base-content/70 text-left">
                    <ShieldAlert className="size-4 text-warning shrink-0" />
                    <span>Connect with this user to start messaging and calling.</span>
                  </div>
                )}
                {relationshipState === "OUTGOING_PENDING" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning-content/90 text-left">
                    <Clock className="size-4 text-warning shrink-0 animate-pulse" />
                    <span>Contact request pending. Direct messaging will unlock once accepted.</span>
                  </div>
                )}
                {relationshipState === "INCOMING_PENDING" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-info/10 border border-info/20 text-xs text-info-content/90 text-left">
                    <UserPlus className="size-4 text-info shrink-0" />
                    <span>{user?.fullName || "This user"} wants to connect with you.</span>
                  </div>
                )}
                {relationshipState === "BLOCKED" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error text-left">
                    <Ban className="size-4 shrink-0" />
                    <span>You have blocked this user. Unblock to send messages.</span>
                  </div>
                )}
              </div>
            )}

            {/* Metadata Cards Grid */}
            <div className="w-full mt-3.5 space-y-2 text-left bg-base-200/50 p-3.5 rounded-2xl border border-base-300/60">
              <div className="flex items-center gap-3 text-xs text-base-content/80">
                <Lock className="size-4 text-primary shrink-0" />
                <span>End-to-end encrypted messaging</span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-3 text-xs text-base-content/80">
                  <Smartphone className="size-4 text-primary shrink-0" />
                  <span className="font-mono">{user.phone}</span>
                </div>
              )}
              {user?.location && (
                <div className="flex items-center gap-3 text-xs text-base-content/80">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <span>{user.location}</span>
                </div>
              )}
              {memberSince && (
                <div className="flex items-center gap-3 text-xs text-base-content/80">
                  <Calendar className="size-4 text-primary shrink-0" />
                  <span>Member since {memberSince}</span>
                </div>
              )}

              {/* Mutual Contacts Section */}
              {mutualContacts.length > 0 && (
                <div className="pt-2 border-t border-base-300/40">
                  <p className="text-[11px] font-semibold text-base-content/60 mb-1.5 flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" />
                    Mutual Contacts ({mutualContacts.length})
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {mutualContacts.slice(0, 5).map((m) => (
                      <span
                        key={m._id || m.id}
                        className="badge badge-sm bg-base-100 text-[10px] border border-base-300"
                      >
                        {m.fullName}
                      </span>
                    ))}
                    {mutualContacts.length > 5 && (
                      <span className="text-[10px] text-base-content/50">
                        +{mutualContacts.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contextual Action Buttons */}
            {isMe ? (
              <div className="w-full mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate("/profile");
                  }}
                  className="btn btn-primary w-full rounded-xl gap-2 shadow-sm font-medium"
                >
                  <User className="size-4.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQR(true)}
                  className="btn btn-outline w-full rounded-xl gap-2 font-medium"
                >
                  <QrCode className="size-4.5" />
                  <span>Share My QR Code</span>
                </button>
              </div>
            ) : (
              <div className="w-full mt-4 space-y-2">
                {/* State A: NOT CONNECTED */}
                {relationshipState === "NOT_CONNECTED" && (
                  <div className="space-y-2 w-full">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleSendRequest}
                      className="btn btn-primary w-full rounded-xl gap-2 shadow-sm font-medium"
                    >
                      <UserPlus className="size-4.5" />
                      <span>Add Contact</span>
                    </button>
                    <div className="grid grid-cols-3 gap-1.5 opacity-40 pointer-events-none">
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <MessageCircle className="size-4" />
                        <span className="text-[10px]">Chat</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Phone className="size-4" />
                        <span className="text-[10px]">Audio</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Video className="size-4" />
                        <span className="text-[10px]">Video</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State B: OUTGOING REQUEST PENDING */}
                {relationshipState === "OUTGOING_PENDING" && (
                  <div className="space-y-2 w-full">
                    <button
                      type="button"
                      disabled={isActionLoading || isCancelling}
                      aria-busy={isCancelling}
                      aria-label="Cancel sent contact request"
                      onClick={handleCancelRequest}
                      className="btn btn-outline btn-error w-full rounded-xl gap-2 font-medium min-h-10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="size-4.5 animate-spin shrink-0" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <X className="size-4.5 shrink-0" />
                          <span>Cancel Request</span>
                        </>
                      )}
                    </button>
                    <div className="grid grid-cols-3 gap-1.5 opacity-40 pointer-events-none">
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <MessageCircle className="size-4" />
                        <span className="text-[10px]">Chat</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Phone className="size-4" />
                        <span className="text-[10px]">Audio</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Video className="size-4" />
                        <span className="text-[10px]">Video</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State C: INCOMING REQUEST PENDING */}
                {relationshipState === "INCOMING_PENDING" && (
                  <div className="space-y-2 w-full">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        type="button"
                        disabled={isIncomingBusy}
                        aria-busy={isAccepting}
                        aria-label="Accept friend request"
                        onClick={handleAcceptRequest}
                        className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl gap-2 font-medium min-w-[105px] h-10 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="size-4 animate-spin shrink-0" />
                            <span>Accepting...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-4 shrink-0" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isIncomingBusy}
                        aria-busy={isDeclining}
                        aria-label="Decline friend request"
                        onClick={handleDeclineRequest}
                        className="btn border border-base-300 hover:border-error/50 hover:bg-error/10 hover:text-error text-base-content/80 rounded-xl gap-2 font-medium min-w-[105px] h-10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isDeclining ? (
                          <>
                            <Loader2 className="size-4 animate-spin text-error shrink-0" />
                            <span>Declining...</span>
                          </>
                        ) : (
                          <>
                            <UserX className="size-4 shrink-0" />
                            <span>Decline</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 opacity-40 pointer-events-none">
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <MessageCircle className="size-4" />
                        <span className="text-[10px]">Chat</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Phone className="size-4" />
                        <span className="text-[10px]">Audio</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Video className="size-4" />
                        <span className="text-[10px]">Video</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State D: ACCEPTED MUTUAL CONTACT */}
                {relationshipState === "ACCEPTED" && (
                  <div className="w-full space-y-2">
                    <button
                      type="button"
                      onClick={handleStartChat}
                      className="btn btn-primary w-full rounded-xl gap-2 shadow-sm font-medium"
                    >
                      <MessageCircle className="size-4.5" />
                      <span>Send Message</span>
                    </button>
                    <div className="grid grid-cols-4 gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleCall("audio")}
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Phone className="size-4" />
                        <span className="text-[10px]">Audio</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCall("video")}
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Video className="size-4" />
                        <span className="text-[10px]">Video</span>
                      </button>
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={handleToggleBlock}
                        className="btn btn-sm btn-outline rounded-xl flex flex-col h-auto py-2 gap-1"
                      >
                        <Ban className="size-4" />
                        <span className="text-[10px]">Block</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReport(true)}
                        className="btn btn-sm btn-outline btn-warning rounded-xl flex flex-col h-auto py-2 gap-1"
                        title="Report user"
                      >
                        <AlertTriangle className="size-4" />
                        <span className="text-[10px]">Report</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State F: BLOCKED */}
                {relationshipState === "BLOCKED" && (
                  <div className="w-full space-y-2">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleToggleBlock}
                      className="btn btn-error btn-outline w-full rounded-xl gap-2 font-medium"
                    >
                      <ShieldCheck className="size-4.5" />
                      <span>Unblock User</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>
      </ModalLayout>

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeModal
          open={showQR}
          onClose={() => setShowQR(false)}
          user={user}
        />
      )}

      {/* Report User Modal */}
      {showReport && (
        <ReportUserModal
          open={showReport}
          onClose={() => setShowReport(false)}
          user={user}
        />
      )}
    </>
  );
};

export default ProfileCardModal;
