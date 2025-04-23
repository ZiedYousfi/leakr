import SubscribeForm from "@/components/MailingListSubscribeForm"; // Import the SubscribeForm component
//import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-gray-300 font-[family-name:var(--font-geist-mono)] p-8">
      <main className="flex flex-col items-center text-center gap-8">
        {/* <Image
          src="/logo.png"
          alt="Leakr Logo"
          width={512}
          height={512}
          className="w-64 h-64 mb-4"
        /> */}

        <h1 className="text-5xl font-bold text-[#7E5BEF]">Leakr</h1>

        <p className="text-lg text-[#B0B0B0] max-w-xl">
          Leakr helps you discover, manage, and organize content from your
          favorite creators across platforms like Twitch, YouTube, Twitter, and
          more. Save content, manage profiles, and keep everything in one place
          with our browser extension. Explore community findings and secure your
          digital footprint.
        </p>

        {/* <div className="flex gap-4 mt-6">
          <Link
            href="/community" // Update with actual community route
            className="px-6 py-2 rounded-md border border-[#B0B0B0] text-[#B0B0B0] font-semibold hover:bg-gray-800 hover:text-white transition-colors"
          >
            Explore Community
          </Link>
          Add link to extension download or info page if available
          <Link href="/extension" className="...">Get the Extension</Link>
        </div> */}

        {/* Mailing List Section */}
        <div className="mt-12 flex flex-col items-center gap-4 w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-white">Stay Updated!</h2>
          <p className="text-md text-[#B0B0B0]">
            Subscribe to our mailing list for the latest updates and news about
            Leakr.
          </p>
          <SubscribeForm />
        </div>
      </main>

      <footer className="absolute bottom-8 text-sm text-gray-500">
        © {new Date().getFullYear()} Leakr. All rights reserved.
      </footer>
    </div>
  );
}
