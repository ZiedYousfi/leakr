"use client";

import { useEffect, useState } from 'react';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const envProgress = parseInt(process.env.NEXT_PUBLIC_PROGRESS || '0', 10);
    if (!isNaN(envProgress)) {
      setProgress(Math.min(Math.max(envProgress, 0), 100));
    }
  }, []);

  const totalBlocks = 30;
  const filledBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div className="flex flex-col items-center space-y-4 pt-10">
      <p className="text-sm text-[#B0B0B0] font-mono animate-fade-in">
        This is how close we are to the final version of <span className="text-[#7E5BEF]">Leakr</span>. Stay tuned.
      </p>
      <div className="bg-black p-4 rounded-2xl animate-strong-pulse">
        <div className="flex gap-2">
          {[...Array(totalBlocks)].map((_, index) => (
            <div
              key={index}
              className={`w-5 h-5 rounded-sm ${index < filledBlocks ? 'bg-[#7E5BEF] animate-block-activity' : 'bg-gray-700 animate-idle-glimmer'}`}
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .animate-block-activity {
          animation: block-activity 2s infinite ease-in-out;
        }

        .animate-idle-glimmer {
          animation: idle-glimmer 3s infinite ease-in-out;
        }

        @keyframes block-activity {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 4px #7E5BEF);
          }
          50% {
            transform: scale(1.2);
            filter: drop-shadow(0 0 12px #7E5BEF);
          }
        }

        @keyframes idle-glimmer {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
            filter: brightness(1.2);
          }
        }

        .animate-fade-in {
          animation: fade-in 2s ease-in;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-strong-pulse {
          animation: strong-pulse 2.5s infinite ease-in-out;
          box-shadow: 0 0 30px #7E5BEFaa, 0 0 50px #7E5BEF77;
        }

        @keyframes strong-pulse {
          0%, 100% {
            box-shadow: 0 0 30px #7E5BEFaa, 0 0 50px #7E5BEF77;
          }
          50% {
            box-shadow: 0 0 50px #7E5BEFdd, 0 0 80px #7E5BEFaa;
          }
        }
      `}</style>
    </div>
  );
}
