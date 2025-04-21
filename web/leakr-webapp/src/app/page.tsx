import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-gray-300 font-[family-name:var(--font-geist-mono)] p-8">
      <main className="flex flex-col items-center text-center gap-8">
        {/* Placeholder for Logo - Consider using an SVG or Image component */}
        <div className="w-24 h-24 bg-[#7E5BEF] rounded-full mb-4 flex items-center justify-center text-black text-4xl font-bold">
          L
        </div>

        <h1 className="text-5xl font-bold text-[#7E5BEF]">
          Leakr
        </h1>

        <p className="text-lg text-[#B0B0B0] max-w-md">
          Manage your extension data, explore community findings, and secure your digital footprint.
        </p>

        <div className="flex gap-4 mt-6">
          <Link
            href="/community" // Update with actual community route
            className="px-6 py-2 rounded-md border border-[#B0B0B0] text-[#B0B0B0] font-semibold hover:bg-gray-800 hover:text-white transition-colors"
          >
            Explore Community
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 text-sm text-gray-500">
        © {new Date().getFullYear()} Leakr. All rights reserved.
      </footer>
    </div>
  );
}
