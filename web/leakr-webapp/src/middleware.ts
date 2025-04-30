import { NextResponse } from "next/server";

// import { clerkMiddleware } from "@clerk/nextjs/server";

// export default clerkMiddleware();

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
//     // Always run for API routes
//     "/(api|trpc)(.*)",
//   ],
// };

// This function can be marked `async` if using `await` inside
export function middleware() {
  console.log("middleware running");
  return NextResponse.next();
}

// See the documentation for more information about defining matcher: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: "/about/:path*",
};
