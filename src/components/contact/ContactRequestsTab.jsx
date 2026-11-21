import { useState, useEffect } from "react";
import {
  UserCheck,
  UserX,
  Clock,
  Ban,
  Users,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  History,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useContactStore } from "../../store/useContactStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Avatar, EmptyState } from "../Sidebar/SidebarComponents.jsx";
import { avatarSrc } from "../Sidebar/sidebarUtils.js";
import ProfileCardModal from "./ProfileCardModal";
import ReportUserModal from "./ReportUserModal";

export const ContactRequestsTab = () => {
  const {
    requests,
    isRequestsLoading,
    fetchRequests,
    acceptContactRequest,
    rejectContactRequest,
    cancelContactRequest,
    requestActionLoading,
    requestHistory,
    isHistoryLoading,
    fetchRequestHistory,
    blockUser,
  } = useContactStore();

  const [activeSubTab, setActiveSubTab] = useState("incoming"); // "incoming" | "outgoing" | "history"
  const [historyFilter, setHistoryFilter] = useState(""); // "" | "accepted" | "rejected" | "cancelled"
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [reportTargetUser, setReportTargetUser] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [justAcceptedIds, setJustAcceptedIds] = useState(new Set());

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (activeSubTab === "history") {
      fetchRequestHistory(historyFilter);
    }
  }, [activeSubTab, historyFilter, fetchRequestHistory]);

  const incoming = requests?.incoming || [];
  const outgoing = requests?.outgoing || [];

  const handleAccept = async (e, reqId) => {
    e.stopPropagation();
    const id = String(reqId || "").trim();
    if (!id || id === "undefined" || id === "null") {
      console.error("[ContactRequestsTab] Cannot accept: missing or invalid request ID");
      return;
    }
    const success = await acceptContactRequest(id);
    if (success) {
      setJustAcceptedIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setJustAcceptedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 1500);
    }
  };

  const handleReject = async (e, reqId) => {
    e.stopPropagation();
    const id = String(reqId || "").trim();
    if (!id || id === "undefined" || id === "null") {
      console.error("[ContactRequestsTab] Cannot reject: missing or invalid request ID");
      return;
    }
    await rejectContactRequest(id);
  };

  const handleCancel = async (e, reqId) => {
    e.stopPropagation();
    const id = String(reqId || "").trim();
    if (!id || id === "undefined" || id === "null") {
      console.error("[ContactRequestsTab] Cannot cancel: missing or invalid request ID");
      return;
    }
    await cancelContactRequest(id);
  };

  const handleBlock = async (e, userId, reqId) => {
    e.stopPropagation();
    const id = String(reqId || "").trim();
    if (id && id !== "undefined" && id !== "null") {
      setActionBusyId(id);
    }
    if (userId) {
      await blockUser(userId);
    }
    if (id && id !== "undefined" && id !== "null") {
      await rejectContactRequest(id);
      setActionBusyId(null);
    }
  };

  const handleReport = (e, user) => {
    e.stopPropagation();
    setReportTargetUser(user);
  };

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Sub tabs: Incoming / Outgoing / History */}
      <div className="px-3 pt-2 pb-1 border-b border-base-300/60 bg-base-100/90 shrink-0">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-base-200/80 p-1 select-none border border-base-300/50">
          <button
            type="button"
            onClick={() => setActiveSubTab("incoming")}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === "incoming"
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <Inbox className="size-3.5" />
            <span>Received</span>
            {incoming.length > 0 && (
              <span className="badge badge-primary badge-xs font-bold px-1.5 py-0.5">
                {incoming.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("outgoing")}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === "outgoing"
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <Send className="size-3.5" />
            <span>Sent</span>
            {outgoing.length > 0 && (
              <span className="badge badge-ghost badge-xs font-bold px-1.5 py-0.5">
                {outgoing.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === "history"
                ? "bg-base-100 text-base-content shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <History className="size-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* History filter toolbar */}
      {activeSubTab === "history" && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-base-300/40 bg-base-100/60 overflow-x-auto text-xs">
          {[
            { value: "", label: "All" },
            { value: "accepted", label: "Accepted" },
            { value: "rejected", label: "Declined" },
            { value: "cancelled", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setHistoryFilter(f.value)}
              className={`btn btn-xs rounded-lg border-0 ${
                historyFilter === f.value
                  ? "bg-primary text-primary-content font-bold"
                  : "bg-base-200/80 text-base-content/60 hover:text-base-content"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* List content */}
      <div className="flex-1 overflow-y-auto divide-y divide-base-300/40">
        {(isRequestsLoading || (activeSubTab === "history" && isHistoryLoading)) && (
          <div className="flex items-center justify-center py-12 text-primary">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {!isRequestsLoading && activeSubTab === "incoming" && (
          <>
            {incoming.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No contact requests"
                subtitle="When someone sends you a contact request, it will appear here."
              />
            ) : (
              incoming.map((req, index) => {
                const reqId = String(req.id || req._id || req.requestId || "");
                const sender = req.sender || {};
                const isAccepting = Boolean(reqId && requestActionLoading?.[reqId] === "accepting");
                const isDeclining = Boolean(reqId && requestActionLoading?.[reqId] === "declining");
                const isCardBusy = isAccepting || isDeclining || Boolean(reqId && actionBusyId === reqId);
                const isAccepted = justAcceptedIds.has(reqId);
                const uniqueKey = reqId || sender._id || sender.id || `req-incoming-${index}`;

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => setSelectedProfileUser(sender)}
                    className="p-3.5 flex flex-col gap-2.5 hover:bg-base-200/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={avatarSrc(sender.avatar)}
                        name={sender.fullName}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-base-content truncate">
                            {sender.fullName || "User"}
                          </h4>
                          <span className="text-[10px] text-base-content/50 shrink-0">
                            {req.createdAt
                              ? new Date(req.createdAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""}
                          </span>
                        </div>
                        {sender.username && (
                          <p className="text-xs text-primary font-medium truncate">
                            @{sender.username}
                          </p>
                        )}
                        {req.mutualCount > 0 && (
                          <p className="text-[11px] text-base-content/60 flex items-center gap-1 mt-0.5">
                            <Users className="size-3 text-primary" />
                            <span>
                              {req.mutualCount} mutual contact
                              {req.mutualCount > 1 ? "s" : ""}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {req.note && (
                      <div className="text-xs text-base-content/80 bg-base-200/70 px-3 py-1.5 rounded-xl border border-base-300/40 italic">
                        "{req.note}"
                      </div>
                    )}

                    {isAccepted ? (
                      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>Friend request accepted!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          disabled={isCardBusy || !reqId}
                          aria-busy={isAccepting}
                          aria-label="Accept friend request"
                          onClick={(e) => handleAccept(e, reqId)}
                          className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1.5 flex-1 rounded-lg min-w-[105px] h-8 font-medium transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isAccepting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin shrink-0" />
                              <span>Accepting...</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-3.5 shrink-0" />
                              <span>Accept</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isCardBusy || !reqId}
                          aria-busy={isDeclining}
                          aria-label="Decline friend request"
                          onClick={(e) => handleReject(e, reqId)}
                          className="btn btn-xs border border-base-300 hover:border-error/50 hover:bg-error/10 hover:text-error text-base-content/80 gap-1.5 flex-1 rounded-lg min-w-[105px] h-8 font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isDeclining ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin text-error shrink-0" />
                              <span>Declining...</span>
                            </>
                          ) : (
                            <>
                              <UserX className="size-3.5 shrink-0" />
                              <span>Decline</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isCardBusy || !reqId}
                          onClick={(e) => handleBlock(e, sender._id || sender.id, reqId)}
                          title="Block user"
                          aria-label="Block user"
                          className="btn btn-xs btn-ghost btn-square text-error hover:bg-error/10 rounded-lg size-8 transition-colors disabled:opacity-50"
                        >
                          <Ban className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleReport(e, sender)}
                          title="Report user"
                          aria-label="Report user"
                          className="btn btn-xs btn-ghost btn-square text-warning hover:bg-warning/10 rounded-lg size-8 transition-colors"
                        >
                          <AlertTriangle className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {!isRequestsLoading && activeSubTab === "outgoing" && (
          <>
            {outgoing.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No pending requests"
                subtitle="Requests you send to other users will show here until accepted."
              />
            ) : (
              outgoing.map((req, index) => {
                const reqId = String(req.id || req._id || req.requestId || "");
                const recipient = req.recipient || {};
                const isCancelling = Boolean(reqId && requestActionLoading?.[reqId] === "cancelling");
                const isCardBusy = isCancelling || Boolean(reqId && actionBusyId === reqId);
                const uniqueKey = reqId || recipient._id || recipient.id || `req-outgoing-${index}`;

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => setSelectedProfileUser(recipient)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-base-200/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={avatarSrc(recipient.avatar)}
                        name={recipient.fullName}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-base-content truncate">
                          {recipient.fullName || "User"}
                        </h4>
                        {recipient.username && (
                          <p className="text-xs text-primary font-medium truncate">
                            @{recipient.username}
                          </p>
                        )}
                        <span className="text-[10px] text-warning flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" /> Pending response
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCardBusy || !reqId}
                      aria-busy={isCancelling}
                      aria-label="Cancel sent contact request"
                      onClick={(e) => handleCancel(e, reqId)}
                      className="btn btn-xs btn-ghost text-base-content/60 hover:text-error rounded-lg shrink-0 min-w-[95px] h-7 gap-1 disabled:opacity-50"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="size-3 animate-spin shrink-0" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <span>Cancel</span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeSubTab === "history" && !isHistoryLoading && (
          <>
            {requestHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title="No request history"
                subtitle="Past accepted, declined, or cancelled requests will appear here."
              />
            ) : (
              requestHistory.map((h, index) => {
                const hId = String(h.id || h._id || h.requestId || "");
                const partner = h.sender || h.recipient || {};
                const isAccepted = h.status === "accepted";
                const isRejected = h.status === "rejected";
                const isCancelled = h.status === "cancelled";
                const uniqueKey = hId || partner._id || partner.id || `req-history-${index}`;

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => partner._id && setSelectedProfileUser(partner)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-base-200/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={avatarSrc(partner.avatar)}
                        name={partner.fullName}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-base-content truncate">
                          {partner.fullName || "User"}
                        </h4>
                        {partner.username && (
                          <p className="text-xs text-base-content/60 truncate">
                            @{partner.username}
                          </p>
                        )}
                        <span className="text-[10px] text-base-content/40">
                          {h.respondedAt || h.createdAt
                            ? new Date(h.respondedAt || h.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`badge badge-sm text-[11px] capitalize font-medium ${
                        isAccepted
                          ? "badge-success badge-outline gap-1"
                          : isRejected
                            ? "badge-error badge-outline gap-1"
                            : "badge-ghost gap-1"
                      }`}
                    >
                      {isAccepted && <CheckCircle2 className="size-3" />}
                      {isRejected && <XCircle className="size-3" />}
                      {isCancelled && <Clock className="size-3" />}
                      <span>{h.status}</span>
                    </span>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {selectedProfileUser && (
        <ProfileCardModal
          open={Boolean(selectedProfileUser)}
          onClose={() => setSelectedProfileUser(null)}
          user={selectedProfileUser}
        />
      )}

      {reportTargetUser && (
        <ReportUserModal
          open={Boolean(reportTargetUser)}
          onClose={() => setReportTargetUser(null)}
          user={reportTargetUser}
        />
      )}
    </div>
  );
};

export default ContactRequestsTab;
