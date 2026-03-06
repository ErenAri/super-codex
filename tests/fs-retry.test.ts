import { describe, expect, it } from "vitest";

import { isTransientFsError, removePathWithRetry } from "../src/fs-retry";

describe("fs retry utilities", () => {
  it("retries transient errors and eventually succeeds", async () => {
    let attempts = 0;
    await removePathWithRetry("virtual-path", {
      attempts: 5,
      baseDelayMs: 1,
      rmOptions: { recursive: true, force: true },
      removeFn: async () => {
        attempts += 1;
        if (attempts < 3) {
          const error = new Error("busy") as NodeJS.ErrnoException;
          error.code = "EBUSY";
          throw error;
        }
      },
      sleepFn: async () => {}
    });

    expect(attempts).toBe(3);
  });

  it("does not retry non-transient errors", async () => {
    let attempts = 0;
    await expect(removePathWithRetry("virtual-path", {
      attempts: 5,
      baseDelayMs: 1,
      rmOptions: { recursive: true, force: true },
      removeFn: async () => {
        attempts += 1;
        const error = new Error("invalid") as NodeJS.ErrnoException;
        error.code = "EINVAL";
        throw error;
      },
      sleepFn: async () => {}
    })).rejects.toThrow(/invalid/i);

    expect(attempts).toBe(1);
  });

  it("throws after retries are exhausted for transient errors", async () => {
    let attempts = 0;
    await expect(removePathWithRetry("virtual-path", {
      attempts: 3,
      baseDelayMs: 1,
      rmOptions: { recursive: true, force: true },
      removeFn: async () => {
        attempts += 1;
        const error = new Error("not empty") as NodeJS.ErrnoException;
        error.code = "ENOTEMPTY";
        throw error;
      },
      sleepFn: async () => {}
    })).rejects.toThrow(/not empty/i);

    expect(attempts).toBe(3);
  });

  it("recognizes transient fs error codes", () => {
    const transient = new Error("busy") as NodeJS.ErrnoException;
    transient.code = "EBUSY";
    const nonTransient = new Error("invalid") as NodeJS.ErrnoException;
    nonTransient.code = "EINVAL";

    expect(isTransientFsError(transient)).toBe(true);
    expect(isTransientFsError(nonTransient)).toBe(false);
  });
});
