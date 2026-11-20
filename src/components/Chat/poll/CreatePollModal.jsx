import React, { useState } from "react";
import { Plus, Trash2, BarChart2, X, Clock, ShieldCheck, CheckSquare } from "lucide-react";
import { customToast as toast } from "../../toast/customToastService.js";
import { axiosInstance } from "../../../lib/axios.js";

const CreatePollModal = ({ isGroup = false, targetId, onClose, onCreated }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [canChangeVote, setCanChangeVote] = useState(true);
  const [duration, setDuration] = useState("never");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 10) {
      toast.error("Maximum 10 poll options allowed.");
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast.error("Poll must have at least 2 options.");
      return;
    }
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (text, index) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) {
      toast.error("Please enter a question.");
      return;
    }

    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      toast.error("Please provide at least 2 non-empty options.");
      return;
    }

    if (!targetId) {
      toast.error(
        isGroup ? "Target group is required." : "Please select a recipient first.",
      );
      return;
    }

    let expiresAt = null;
    if (duration !== "never") {
      const now = Date.now();
      const durations = {
        "1h": 3600 * 1000,
        "24h": 24 * 3600 * 1000,
        "3d": 3 * 24 * 3600 * 1000,
        "1w": 7 * 24 * 3600 * 1000,
      };
      if (durations[duration]) {
        expiresAt = new Date(now + durations[duration]).toISOString();
      }
    }

    setIsSubmitting(true);
    try {
      const endpoint = isGroup ? `/groups/${targetId}/polls` : "/messages/polls";
      const payload = {
        question: q,
        options: validOptions,
        isAnonymous,
        allowMultipleAnswers,
        canChangeVote,
        expiresAt,
        ...(isGroup ? {} : { receiverId: targetId }),
      };

      const res = await axiosInstance.post(endpoint, payload);
      if (res.data?.success) {
        toast.success("Poll created!");
        if (onCreated) onCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error("[CreatePoll] Failed to create:", err);
      toast.error(err?.response?.data?.message || "Failed to create poll.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-base-200/50">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-base-content">Create a Poll</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Question */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
              Poll Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              rows={2}
              maxLength={500}
              className="textarea textarea-bordered w-full text-sm rounded-xl focus:textarea-primary resize-none"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
                Options ({options.length}/10)
              </label>
            </div>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, idx)}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={200}
                    className="input input-sm input-bordered w-full rounded-lg text-xs focus:input-primary"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="btn btn-sm btn-ghost gap-1.5 text-xs text-primary font-medium hover:bg-primary/10 mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Option
              </button>
            )}
          </div>

          <div className="divider my-1 text-xs text-base-content/40">Settings</div>

          {/* Toggles */}
          <div className="space-y-3 bg-base-200/40 p-3.5 rounded-xl border border-base-300/50">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-base-content">Allow Multiple Answers</span>
              <input
                type="checkbox"
                checked={allowMultipleAnswers}
                onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
                className="toggle toggle-sm toggle-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-base-content">Anonymous Voting</span>
                <span className="text-[10px] text-base-content/60">Voters will not be revealed</span>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="toggle toggle-sm toggle-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-base-content">Allow Changing Vote</span>
              <input
                type="checkbox"
                checked={canChangeVote}
                onChange={(e) => setCanChangeVote(e.target.checked)}
                className="toggle toggle-sm toggle-primary"
              />
            </label>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-base-content flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-base-content/60" /> Poll Duration
              </span>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="select select-bordered select-xs rounded-lg"
              >
                <option value="never">No Expiration</option>
                <option value="1h">1 Hour</option>
                <option value="24h">24 Hours</option>
                <option value="3d">3 Days</option>
                <option value="1w">1 Week</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-sm btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-sm btn-primary text-xs gap-1.5 shadow-md shadow-primary/20"
            >
              {isSubmitting ? "Creating..." : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;
