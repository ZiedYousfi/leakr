import { Link, Outlet, useNavigate } from 'react-router'
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/chrome-extension'

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

export const RootLayout = () => {
  const navigate = useNavigate()

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <div className="plasmo-w-[785px] plasmo-h-[600px]">
        <main>
          <Outlet />
        </main>
        <footer>
          <SignedIn>
            <Link to="/settings">Settings</Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link to="/">Home</Link>
            <Link to="/sign-in">Sign In</Link>
            <Link to="/sign-up">Sign Up</Link>
          </SignedOut>
        </footer>
      </div>
    </ClerkProvider>
  )
}
