import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { customToast, customToastService } from "../src/components/toast/customToastService.js";

describe("Centralized Custom Toast Service Suite", () => {
  beforeEach(() => {
    customToastService.dismissAll();
  });

  it("1. Successfully emits a success toast with expected payload", () => {
    const id = customToast.success("Profile updated successfully!");
    const toasts = customToastService.getToasts();

    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].id, id);
    assert.strictEqual(toasts[0].type, "success");
    assert.strictEqual(toasts[0].message, "Profile updated successfully!");
  });

  it("2. Successfully emits error, info, and warning toasts", () => {
    customToast.error("Failed to fetch messages");
    customToast.info("Devi is now online");
    customToast.warning("Poor network connectivity");

    const toasts = customToastService.getToasts();
    assert.strictEqual(toasts.length, 3);
    assert.strictEqual(toasts[0].type, "error");
    assert.strictEqual(toasts[1].type, "info");
    assert.strictEqual(toasts[2].type, "warning");
  });

  it("3. Loading toast has Infinity duration and transitions smoothly to success", () => {
    const loadingId = customToast.loading("Encrypting group keys...");
    let toasts = customToastService.getToasts();

    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].type, "loading");
    assert.strictEqual(toasts[0].duration, Infinity);

    // Transition in-place
    customToast.success("Group keys encrypted successfully!", { id: loadingId });
    toasts = customToastService.getToasts();

    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].id, loadingId);
    assert.strictEqual(toasts[0].type, "success");
    assert.strictEqual(toasts[0].message, "Group keys encrypted successfully!");
    assert.notStrictEqual(toasts[0].duration, Infinity);
  });

  it("4. Loading toast transitions smoothly to error", () => {
    const loadingId = customToast.loading("Uploading avatar...");
    customToast.error("File size exceeds 5MB limit", { id: loadingId });

    const toasts = customToastService.getToasts();
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].id, loadingId);
    assert.strictEqual(toasts[0].type, "error");
    assert.strictEqual(toasts[0].message, "File size exceeds 5MB limit");
  });

  it("5. Dismiss removes a specific toast, and dismissAll clears all", () => {
    const id1 = customToast.info("Message 1");
    const id2 = customToast.info("Message 2");
    assert.strictEqual(customToastService.getToasts().length, 2);

    customToast.dismiss(id1);
    const remaining = customToastService.getToasts();
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].id, id2);

    customToast.dismissAll();
    assert.strictEqual(customToastService.getToasts().length, 0);
  });

  it("6. Deduplicates identical messages within short window", () => {
    customToast.error("Connection failed");
    customToast.error("Connection failed");
    customToast.error("Connection failed");

    const toasts = customToastService.getToasts();
    assert.strictEqual(toasts.length, 1);
  });

  it("7. Promise helper transitions from loading to success on resolve", async () => {
    const fakePromise = Promise.resolve("Done!");
    await customToast.promise(fakePromise, {
      loading: "Processing...",
      success: (res) => `Success: ${res}`,
      error: "Failed!",
    });

    const toasts = customToastService.getToasts();
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].type, "success");
    assert.strictEqual(toasts[0].message, "Success: Done!");
  });

  it("8. Promise helper transitions from loading to error on reject", async () => {
    const fakePromise = Promise.reject(new Error("Network timeout"));
    try {
      await customToast.promise(fakePromise, {
        loading: "Connecting...",
        success: "Connected",
        error: (err) => `Failed: ${err.message}`,
      });
    } catch {
      // Expected
    }

    const toasts = customToastService.getToasts();
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].type, "error");
    assert.strictEqual(toasts[0].message, "Failed: Network timeout");
  });
});
