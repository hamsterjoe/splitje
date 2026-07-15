import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { requiresOwnerSession } from "./application/auth/route-access";
import type { Database } from "./infrastructure/supabase/database.types";
import { getPublicSupabaseEnv } from "./infrastructure/supabase/env";

export async function proxy(
  request: NextRequest,
) {
  const environment = getPublicSupabaseEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          for (const {
            name,
            value,
          } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({
            request,
          });

          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            supabaseResponse.cookies.set(
              name,
              value,
              options,
            );
          }

          for (const [name, value] of Object.entries(
            headers,
          )) {
            supabaseResponse.headers.set(
              name,
              value,
            );
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    requiresOwnerSession(
      request.nextUrl.pathname,
    )
  ) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    const redirectResponse =
      NextResponse.redirect(loginUrl);

    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};