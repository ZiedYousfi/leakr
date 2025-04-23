import { AuthButtons } from "./AuthButtons";

export function Header() {
  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16">
      <AuthButtons />
    </header>
  );
}
