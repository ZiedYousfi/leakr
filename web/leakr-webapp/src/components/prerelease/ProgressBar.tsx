import { useEffect, useState } from 'react';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const envProgress = parseInt(process.env.NEXT_PUBLIC_PROGRESS || '0', 10);
    if (!isNaN(envProgress)) {
      setProgress(Math.min(Math.max(envProgress, 0), 100));
    }
  }, []);

  return (
    <div className="w-full h-4 bg-black rounded-2xl overflow-hidden shadow-inner">
      <div
        className="h-full bg-gradient-to-r from-[#7E5BEF] via-[#B0B0B0] to-[#7E5BEF] animate-glow"
        style={{ width: `${progress}%`, transition: 'width 1.5s ease-in-out' }}
      ></div>

      <style jsx>{`
        .animate-glow {
          background-size: 200% 200%;
          animation: pulse-glow 3s infinite ease-in-out;
        }

        @keyframes pulse-glow {
          0% {
            background-position: 0% 50%;
            filter: drop-shadow(0 0 2px #7E5BEF) drop-shadow(0 0 4px #7E5BEF);
          }
          50% {
            background-position: 100% 50%;
            filter: drop-shadow(0 0 6px #7E5BEF) drop-shadow(0 0 12px #7E5BEF);
          }
          100% {
            background-position: 0% 50%;
            filter: drop-shadow(0 0 2px #7E5BEF) drop-shadow(0 0 4px #7E5BEF);
          }
        }
      `}</style>
    </div>
  );
}
