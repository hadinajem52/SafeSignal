import test from "node:test";
import assert from "node:assert/strict";
import { requestData, requestWithMessage } from "../src/services/api/request.js";

test("requestData returns normalized success payload", async () => {
  const result = await requestData(
    async () => ({ data: { data: { id: 42, ok: true } } }),
    "fallback",
  );

  assert.deepEqual(result, {
    success: true,
    data: { id: 42, ok: true },
  });
});

test("requestData prefers API error message and status", async () => {
  const error = {
    response: {
      data: { message: "Server denied request" },
      status: 403,
    },
    message: "generic message",
  };

  const result = await requestData(async () => {
    throw error;
  }, "fallback");

  assert.deepEqual(result, {
    success: false,
    error: "Server denied request",
    status: 403,
  });
});

test("requestData falls back to thrown message, then fallback message", async () => {
  const withMessage = await requestData(async () => {
    throw new Error("Thrown error message");
  }, "fallback");

  assert.deepEqual(withMessage, {
    success: false,
    error: "Thrown error message",
    status: null,
  });

  const withoutMessage = await requestData(async () => {
    throw { response: { status: 500 } };
  }, "fallback");

  assert.deepEqual(withoutMessage, {
    success: false,
    error: "fallback",
    status: 500,
  });
});

test("requestWithMessage returns normalized success payload including message", async () => {
  const result = await requestWithMessage(
    async () => ({
      data: {
        data: { user_id: 7 },
        message: "Created",
      },
    }),
    "fallback",
  );

  assert.deepEqual(result, {
    success: true,
    data: { user_id: 7 },
    message: "Created",
  });
});

test("requestWithMessage failure shape matches requestData failure shape", async () => {
  const result = await requestWithMessage(async () => {
    throw {
      response: {
        data: { message: "Nope" },
        status: 401,
      },
    };
  }, "fallback");

  assert.deepEqual(result, {
    success: false,
    error: "Nope",
    status: 401,
  });
});
