import test from "node:test";
import assert from "node:assert/strict";
import { API_URL, SOCKET_URL, IS_DEV, IS_PROD } from "../src/config/env.config.js";
import { axiosInstance } from "../src/lib/axios.js";

test("Environment Configuration & Safety Guard Suite", async (t) => {
  await t.test("1. Axios instance uses centralized API_URL as baseURL", () => {
    assert.ok(axiosInstance.defaults.baseURL, "baseURL must be defined");
    assert.equal(axiosInstance.defaults.baseURL, API_URL);
  });

  await t.test("2. Development configuration never leaks Render production URL", () => {
    if (IS_DEV) {
      assert.ok(
        !API_URL.includes("chatty-backend-2l2t.onrender.com"),
        "Local development API_URL must NEVER contain the production Render URL",
      );
      assert.ok(
        !SOCKET_URL.includes("chatty-backend-2l2t.onrender.com"),
        "Local development SOCKET_URL must NEVER contain the production Render URL",
      );
      assert.ok(
        API_URL.includes("localhost:8080"),
        "Local development API_URL must target localhost:8080",
      );
      assert.ok(
        SOCKET_URL.includes("localhost:8080"),
        "Local development SOCKET_URL must target localhost:8080",
      );
    }
  });

  await t.test("3. Socket URL origin format is valid", () => {
    assert.doesNotThrow(() => {
      new URL(SOCKET_URL);
    });
    assert.ok(!SOCKET_URL.endsWith("/"), "Socket URL should not have trailing slash");
    assert.ok(!SOCKET_URL.includes("/api/v1"), "Socket URL should not contain /api/v1 path");
  });
});
