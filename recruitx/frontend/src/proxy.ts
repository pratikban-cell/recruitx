import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const { data: u } = await supabase.auth.getUser();
    user = u.user;
  } catch {
    // Supabase unreachable — treat as unauthenticated
  }

  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedPaths = ["/dashboard", "/negotiations"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Handle role-based routing guards for dashboards
  if (
    user &&
    (pathname.startsWith("/dashboard") || pathname === "/dashboard")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      if (
        pathname.startsWith("/dashboard/candidate") &&
        profile.role === "recruiter"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/recruiter";
        return NextResponse.redirect(url);
      }
      if (
        pathname.startsWith("/dashboard/recruiter") &&
        profile.role === "candidate"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/candidate";
        return NextResponse.redirect(url);
      }
      if (pathname === "/dashboard") {
        const url = request.nextUrl.clone();
        url.pathname =
          profile.role === "recruiter"
            ? "/dashboard/recruiter"
            : "/dashboard/candidate";
        return NextResponse.redirect(url);
      }
    }
  }

  // If logged in and on auth page, redirect to dashboard
  if (user && pathname === "/auth") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname =
      profile?.role === "recruiter"
        ? "/dashboard/recruiter"
        : "/dashboard/candidate";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
