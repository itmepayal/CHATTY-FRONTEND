import { useState } from "react";
import { ModalLayout, ModalHeader, ModalBody, ModalFooter, SecondaryButton, PrimaryButton } from "../chat-ui";
import { ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { useContactStore } from "../../store/useContactStore";
import { customToast as toast } from "../toast";

const REPORT_CATEGORIES = [
  { value: "spam", label: "Spam", desc: "Commercial spam, links, or unsolicited advertising" },
  { value: "harassment", label: "Harassment", desc: "Hate speech, threatening behavior, or bullying" },
  { value: "fake_account", label: "Fake Account", desc: "Bot, stolen identity, or deceptive profile" },
  { value: "inappropriate_profile", label: "Inappropriate Profile", desc: "Offensive photo, name, or bio" },
  { value: "impersonation", label: "Impersonation", desc: "Pretending to be someone else" },
  { value: "other", label: "Other", desc: "Other policy violation or suspicious behavior" },
];

export const ReportUserModal = ({ open, onClose, user }) => {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reportUser = useContactStore((s) => s.reportUser);

  const userId = user?.id || user?._id;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!userId) return;

    setIsSubmitting(true);
    try {
      const ok = await reportUser(userId, { reason, details: details.trim() });
      if (ok) {
        onClose?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout open={open} onClose={onClose} size="sm">
      <ModalHeader
        icon={AlertTriangle}
        title={`Report ${user?.fullName || "User"}`}
        subtitle="Help keep Chatty safe and respectful"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-base-content/80">
              Reason for report
            </label>
            <div className="space-y-1.5">
              {REPORT_CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                    reason === cat.value
                      ? "border-primary bg-primary/5 text-base-content"
                      : "border-base-300/60 hover:bg-base-200/40 text-base-content/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={cat.value}
                    checked={reason === cat.value}
                    onChange={() => setReason(cat.value)}
                    className="radio radio-xs radio-primary mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{cat.label}</p>
                    <p className="text-[10px] text-base-content/50">{cat.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-base-content/80">
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="Describe what occurred or provide relevant context..."
              rows={3}
              className="textarea textarea-bordered textarea-sm w-full rounded-xl text-xs"
            />
            <div className="flex justify-end text-[10px] text-base-content/40">
              {details.length}/500
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-end gap-2">
          <SecondaryButton size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            size="sm"
            type="submit"
            disabled={isSubmitting}
            className="btn-error text-error-content"
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              "Submit Report"
            )}
          </PrimaryButton>
        </ModalFooter>
      </form>
    </ModalLayout>
  );
};

export default ReportUserModal;
