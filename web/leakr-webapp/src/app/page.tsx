import SubscribeForm from "@/components/prerelease/MailingListSubscribeForm";
import ProgressBar from "@/components/prerelease/ProgressBar";
//import Image from "next/image";

export default function Home() {
  return (
    <>
      <ProgressBar />
      {/* Ajustement du padding pour différents écrans */}
      <div className="flex flex-col min-h-screen bg-black text-gray-300 font-[family-name:var(--font-fira-mono)] px-4 sm:px-6 md:px-8">
        {/* Ajustement de la marge supérieure et du padding pour différents écrans */}
        <main className="flex flex-col items-center text-center gap-8 flex-grow justify-center mt-[0vh] sm:mt-[-7vh] md:mt-[-19vh] lg:mt-[-21vh]">
          {/* <Image
            src="/logo.png"
            alt="Leakr Logo"
            width={512}
            height={512}
            className="w-48 h-48 sm:w-64 sm:h-64 mb-4" // Taille ajustée pour petits écrans
          /> */}

          {/* Taille de la police ajustée pour différents écrans */}
          <h1 className="text-4xl sm:text-5xl font-bold text-[#7E5BEF]">
            Leakr
          </h1>

          {/* Taille de la police et largeur max ajustées */}
          <p className="text-base sm:text-lg text-[#B0B0B0] max-w-md sm:max-w-xl font-[var(--font-fira-sans)]">
            🚀 Leakr — Instantly search and discover leaked content from your
            favorite creators on platforms like OnlyFans, Fansly, and more — all
            in one click! 🔥 No need to paste links — Leakr detects profiles
            directly from your current tab and opens curated search results for
            you. Effortlessly organize, filter, and collect the hottest leaks.
            ✨ A fast, simple, and privacy-friendly Chrome extension for those
            who know where to look. 😉
          </p>

          {/* <div className="flex flex-col sm:flex-row gap-4 mt-6"> // Empilement sur petits écrans
            <Link
              href="/community" // Update with actual community route
              className="px-6 py-2 rounded-md border border-[#B0B0B0] text-[#B0B0B0] font-semibold hover:bg-gray-800 hover:text-white transition-colors"
            >
              Explore Community
            </Link>
            Add link to extension download or info page if available
            <Link href="/extension" className="...">Get the Extension</Link>
          </div> */}

          {/* Mailing List Section - Ajustement de la marge supérieure */}
          <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4 w-full max-w-xs sm:max-w-sm">
            {/* Taille de la police ajustée */}
            <h2 className="text-xl sm:text-2xl font-[var(--font-fira-mono)] text-white">
              Stay Updated!
            </h2>
            {/* Taille de la police ajustée */}
            <p className="text-sm sm:text-md text-[#B0B0B0] font-[var(--font-fira-sans)]">
              ️✨ Be the first to know when we launch! Subscribe to our mailing
              list for the latest updates and news about Leakr.
            </p>
            <SubscribeForm />
          </div>
        </main>
      </div>
    </>
  );
}
