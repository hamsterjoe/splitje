import {
    describe,
    expect,
    it,
    vi,
  } from "vitest";
  
  import {
    ensureOwnerSession,
    type OwnerSessionAuthClient,
  } from "./ensure-owner-session";
  
  describe("ensureOwnerSession", () => {
    it("reuses an existing verified user session", async () => {
      const signInAnonymously = vi.fn();
  
      const auth: OwnerSessionAuthClient = {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "existing-user",
            },
          },
          error: null,
        }),
  
        signInAnonymously,
      };
  
      const result = await ensureOwnerSession(auth);
  
      expect(result).toEqual({
        success: true,
        userId: "existing-user",
        createdAnonymousSession: false,
      });
  
      expect(signInAnonymously).not.toHaveBeenCalled();
    });
  
    it("creates an anonymous session when no user exists", async () => {
      const auth: OwnerSessionAuthClient = {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: null,
        }),
  
        signInAnonymously: vi
          .fn()
          .mockResolvedValue({
            data: {
              user: {
                id: "anonymous-user",
              },
            },
            error: null,
          }),
      };
  
      const result = await ensureOwnerSession(auth);
  
      expect(result).toEqual({
        success: true,
        userId: "anonymous-user",
        createdAnonymousSession: true,
      });
    });
  
    it("replaces an invalid or expired session anonymously", async () => {
      const auth: OwnerSessionAuthClient = {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: {
            message: "Session is invalid.",
          },
        }),
  
        signInAnonymously: vi
          .fn()
          .mockResolvedValue({
            data: {
              user: {
                id: "replacement-user",
              },
            },
            error: null,
          }),
      };
  
      const result = await ensureOwnerSession(auth);
  
      expect(result).toEqual({
        success: true,
        userId: "replacement-user",
        createdAnonymousSession: true,
      });
    });
  
    it("returns a structured anonymous-sign-in error", async () => {
      const auth: OwnerSessionAuthClient = {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: null,
        }),
  
        signInAnonymously: vi
          .fn()
          .mockResolvedValue({
            data: {
              user: null,
            },
            error: {
              message: "Anonymous sign-in is disabled.",
            },
          }),
      };
  
      const result = await ensureOwnerSession(auth);
  
      expect(result).toEqual({
        success: false,
        error: {
          code: "ANONYMOUS_SIGN_IN_FAILED",
          message:
            "Unable to start an anonymous owner session.",
        },
      });
    });
  
    it("rejects an empty anonymous-auth response", async () => {
      const auth: OwnerSessionAuthClient = {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null,
          },
          error: null,
        }),
  
        signInAnonymously: vi
          .fn()
          .mockResolvedValue({
            data: {
              user: null,
            },
            error: null,
          }),
      };
  
      const result = await ensureOwnerSession(auth);
  
      expect(result.success).toBe(false);
  
      if (result.success) {
        throw new Error(
          "Expected anonymous sign-in to fail.",
        );
      }
  
      expect(result.error.code).toBe(
        "ANONYMOUS_SIGN_IN_FAILED",
      );
    });
  });