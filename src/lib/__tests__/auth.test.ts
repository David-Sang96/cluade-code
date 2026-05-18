// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

vi.mock("server-only", () => ({}));
vi.mock("next/headers");

import { cookies } from "next/headers";
import { createSession, getSession } from "@/lib/auth";

const TEST_SECRET = new TextEncoder().encode("development-secret-key");

async function signToken(payload: Record<string, unknown>, expiresAt: number | string = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(TEST_SECRET);
}

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("sets an httpOnly auth-token cookie", async () => {
    const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as any);

    await createSession("user-123", "test@example.com");

    expect(store.set).toHaveBeenCalledOnce();
    const [name, , options] = store.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  test("token encodes userId and email", async () => {
    const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as any);

    await createSession("user-123", "test@example.com");

    const token = store.set.mock.calls[0][1];
    const { payload } = await jwtVerify(token, TEST_SECRET);
    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no cookie exists", async () => {
    const store = { get: vi.fn().mockReturnValue(undefined), set: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as any);

    expect(await getSession()).toBeNull();
  });

  test("returns null for an invalid token", async () => {
    const store = { get: vi.fn().mockReturnValue({ value: "not-a-jwt" }), set: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as any);

    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await signToken(
      { userId: "user-123", email: "test@example.com" },
      Math.floor(Date.now() / 1000) - 60
    );
    const store = { get: vi.fn().mockReturnValue({ value: token }), set: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as any);

    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await signToken({ userId: "user-123", email: "test@example.com" });
    const store = { get: vi.fn().mockReturnValue({ value: token }), set: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(store as any);

    const session = await getSession();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });
});
