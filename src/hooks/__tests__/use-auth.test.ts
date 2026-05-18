import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
  (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });
});

describe("useAuth", () => {
  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("calls signInAction with provided credentials", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@example.com", "password123"));

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("returns the result from signInAction", async () => {
      const authResult = { success: false, error: "Invalid credentials" };
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue(authResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual(authResult);
    });

    test("sets isLoading to true during sign-in and false after", async () => {
      let resolveFn: (value: unknown) => void;
      (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveFn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signIn("user@example.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveFn({ success: false }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("clears isLoading even when signInAction throws", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try { await result.current.signIn("user@example.com", "password123"); } catch {}
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when sign-in fails", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@example.com", "wrong"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("navigates after successful sign-in", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@example.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with provided credentials", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@example.com", "password123"));

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    test("returns the result from signUpAction", async () => {
      const authResult = { success: false, error: "Email already registered" };
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue(authResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("taken@example.com", "password123");
      });

      expect(returnValue).toEqual(authResult);
    });

    test("sets isLoading to true during sign-up and false after", async () => {
      let resolveFn: (value: unknown) => void;
      (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveFn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signUp("new@example.com", "password123"); });
      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveFn({ success: false }); });
      expect(result.current.isLoading).toBe(false);
    });

    test("clears isLoading even when signUpAction throws", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try { await result.current.signUp("new@example.com", "password123"); } catch {}
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when sign-up fails", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("taken@example.com", "password123"));

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("navigates after successful sign-up", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signUp("new@example.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });
  });

  describe("post-sign-in navigation", () => {
    const triggerSuccessfulSignIn = async (result: ReturnType<typeof renderHook<ReturnType<typeof useAuth>>>["result"]) => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      await act(() => result.current.signIn("user@example.com", "password123"));
    };

    test("migrates anonymous work into a new project when anon messages exist", async () => {
      const anonMessages = [{ id: "1", role: "user", content: "Build a button" }];
      const anonFileSystem = { "/App.jsx": { type: "file", content: "<button/>" } };
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: anonMessages,
        fileSystemData: anonFileSystem,
      });
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "migrated-project" });

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonMessages,
          data: anonFileSystem,
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/migrated-project");
    });

    test("clears anonymous work after migrating it", async () => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Build something" }],
        fileSystemData: {},
      });

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(clearAnonWork).toHaveBeenCalled();
    });

    test("skips anon work migration when anon messages array is empty", async () => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [],
        fileSystemData: { "/": { type: "directory" } },
      });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("skips anon work migration when getAnonWorkData returns null", async () => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(createProject).not.toHaveBeenCalled();
    });

    test("navigates to most recent project when no anonymous work and projects exist", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });

    test("creates a new project when no anon work and no existing projects", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new-project" });

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });

    test("names the new project when no projects exist", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new-project" });

      const { result } = renderHook(() => useAuth());
      await triggerSuccessfulSignIn(result);

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringMatching(/New Design #\d+/) })
      );
    });
  });
});
