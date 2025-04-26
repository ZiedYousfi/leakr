"use client";

import { useEffect, useState } from "react";

// Définir le breakpoint (correspondant à sm: dans Tailwind)
const SMALL_SCREEN_BREAKPOINT = 912;

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);
  // État pour le nombre total de blocs, initialisé en fonction de la taille d'écran initiale
  const [totalBlocks, setTotalBlocks] = useState(20); // Valeur par défaut pour SSR ou avant hydratation

  useEffect(() => {
    // Fonction pour mettre à jour le nombre de blocs en fonction de la largeur de la fenêtre
    const updateTotalBlocksBasedOnScreenSize = () => {
      if (window.innerWidth < SMALL_SCREEN_BREAKPOINT) {
        setTotalBlocks(20);
      } else {
        setTotalBlocks(30);
      }
    };

    // Mettre à jour une première fois au montage du composant côté client
    updateTotalBlocksBasedOnScreenSize();

    // Ajouter un écouteur d'événement pour le redimensionnement de la fenêtre
    window.addEventListener("resize", updateTotalBlocksBasedOnScreenSize);

    // Nettoyer l'écouteur d'événement lors du démontage du composant
    return () =>
      window.removeEventListener("resize", updateTotalBlocksBasedOnScreenSize);
  }, []); // Le tableau vide assure que cet effet ne s'exécute qu'au montage et au démontage

  useEffect(() => {
    const envProgress = parseInt(process.env.NEXT_PUBLIC_PROGRESS || "0", 10);
    if (!isNaN(envProgress)) {
      setProgress(Math.min(Math.max(envProgress, 0), 100));
    }
  }, []);

  // Calculer les blocs remplis en fonction du nombre total de blocs actuel
  const filledBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div
      className={`flex flex-col items-center space-y-4
                pt-6 pb-12 px-4 w-full max-w-full
                sm:pt-8 sm:pb-14
                md:pt-10 md:pb-16`}
    >
      <p className="text-center text-sm text-[#B0B0B0] font-[var(--font-fira-mono)] animate-fade-in">
        This is how close we are to the final version of{" "}
        <span className="text-[#7E5BEF]">Leakr</span>. Stay tuned.
      </p>
      {/* Padding réduit sur petits écrans, augmenté sur sm et plus */}
      <div className="bg-black p-2 sm:p-4 rounded-2xl animate-strong-pulse">
        {/* Gap réduit sur petits écrans, augmenté sur sm et plus */}
        {/* Utilisation de min-w-0 pour aider au wrapping correct dans certains cas */}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-2 min-w-0">
          {[...Array(totalBlocks)].map((_, index) => (
            <div
              key={index}
              // Taille des blocs réduite sur petits écrans, augmentée sur sm et plus
              className={`w-3 h-3 sm:w-5 sm:h-5 rounded-sm ${index < filledBlocks ? "bg-[#7E5BEF] animate-block-activity" : "bg-gray-700 animate-idle-glimmer"}`}
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: "both",
              }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        /* ...existing styles... */

        .animate-block-activity {
          animation: block-activity 2s infinite ease-in-out;
        }

        .animate-idle-glimmer {
          animation: idle-glimmer 3s infinite ease-in-out;
        }

        @keyframes block-activity {
          0%,
          100% {
            transform: scale(1);
            filter: drop-shadow(
              0 0 2px #7e5bef
            ); /* Ombre réduite pour petits blocs */
          }
          50% {
            transform: scale(1.2);
            filter: drop-shadow(
              0 0 6px #7e5bef
            ); /* Ombre réduite pour petits blocs */
          }
        }
        /* Styles pour écrans sm et plus */
        @media (min-width: 640px) {
          @keyframes block-activity {
            0%,
            100% {
              transform: scale(1);
              filter: drop-shadow(0 0 4px #7e5bef); /* Ombre originale */
            }
            50% {
              transform: scale(1.2);
              filter: drop-shadow(0 0 12px #7e5bef); /* Ombre originale */
            }
          }
        }

        @keyframes idle-glimmer {
          0%,
          100% {
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
          /* Ombre réduite par défaut */
          box-shadow:
            0 0 15px #7e5befaa,
            0 0 25px #7e5bef77;
        }

        @keyframes strong-pulse {
          0%,
          100% {
            /* Ombre réduite par défaut */
            box-shadow:
              0 0 15px #7e5befaa,
              0 0 25px #7e5bef77;
          }
          50% {
            /* Ombre réduite par défaut */
            box-shadow:
              0 0 25px #7e5befdd,
              0 0 40px #7e5befaa;
          }
        }
        /* Styles pour écrans sm et plus */
        @media (min-width: 640px) {
          .animate-strong-pulse {
            /* Ombre originale */
            box-shadow:
              0 0 30px #7e5befaa,
              0 0 50px #7e5bef77;
          }
          @keyframes strong-pulse {
            0%,
            100% {
              /* Ombre originale */
              box-shadow:
                0 0 30px #7e5befaa,
                0 0 50px #7e5bef77;
            }
            50% {
              /* Ombre originale */
              box-shadow:
                0 0 50px #7e5befdd,
                0 0 80px #7e5befaa;
            }
          }
        }
      `}</style>
    </div>
  );
}
