import Link from "next/link";
import { AuthButtons } from "./AuthButtons";

export function Header() {
  return (
    <header className="flex justify-between items-center px-6 py-3 h-16 bg-black border-b border-[#4B4B4B]">
      <div className="flex items-center">
        <Link href="/" className="flex items-center mr-8 group">
          <div className="text-[#7E5BEF] text-2xl font-mono font-bold tracking-tight group-hover:animate-pulse">
            Leakr
          </div>
        </Link>

        <nav className="hidden md:flex space-x-6">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/community">Community</NavLink>
          <NavLink href="/subscribe">Subscribe</NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <AuthButtons />
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[#E0E0E0] font-mono text-sm hover:text-[#7E5BEF] transition-colors relative group"
    >
      <span>{children}</span>
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#7E5BEF] transition-all group-hover:w-full"></span>
    </Link>
  );
}
