export interface OwnerSessionUser {
    id: string;
  }
  
  export interface OwnerSessionAuthClient {
    getUser(): Promise<{
      data: {
        user: OwnerSessionUser | null;
      };
      error: {
        message: string;
      } | null;
    }>;
  
    signInAnonymously(): Promise<{
      data: {
        user: OwnerSessionUser | null;
      };
      error: {
        message: string;
      } | null;
    }>;
  }
  
  export type EnsureOwnerSessionResult =
    | {
        success: true;
        userId: string;
        createdAnonymousSession: boolean;
      }
    | {
        success: false;
        error: {
          code: "ANONYMOUS_SIGN_IN_FAILED";
          message: string;
        };
      };
  
  export async function ensureOwnerSession(
    auth: OwnerSessionAuthClient,
  ): Promise<EnsureOwnerSessionResult> {
    const {
      data: { user: existingUser },
    } = await auth.getUser();
  
    if (existingUser) {
      return {
        success: true,
        userId: existingUser.id,
        createdAnonymousSession: false,
      };
    }
  
    const {
      data: { user: anonymousUser },
      error,
    } = await auth.signInAnonymously();
  
    if (error || !anonymousUser) {
      return {
        success: false,
        error: {
          code: "ANONYMOUS_SIGN_IN_FAILED",
          message:
            "Unable to start an anonymous owner session.",
        },
      };
    }
  
    return {
      success: true,
      userId: anonymousUser.id,
      createdAnonymousSession: true,
    };
  }