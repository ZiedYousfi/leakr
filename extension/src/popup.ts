const input = document.getElementById("twitch-link") as HTMLInputElement;
const actions = document.getElementById("actions") as HTMLDivElement;
import { detectPlatform, Platform } from "./detectPlatform";

function createButton(label: string, onClick: () => void) {
  const btn = document.createElement("button");
  btn.className =
    "flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7E5BEF] hover:bg-[#a18aff] text-white font-mono font-semibold shadow-md transition";
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

function renderButtons(platform: Platform, username: string | null) {
  actions.innerHTML = "";
  const value = username || input.value.trim();
  if (!value) return;

  // 1. Toujours visibles
  actions.appendChild(
    createButton("🔍 Google Search", () => {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
      chrome.tabs.create({ url: searchUrl });
    })
  );
  actions.appendChild(
    createButton("🔍 KBJFree", () => {
      const searchUrl = `https://www.kbjfree.com/search?q=${encodeURIComponent(value)}`;
      chrome.tabs.create({ url: searchUrl });
    })
  );
  actions.appendChild(
    createButton("🕵️‍♂️ Find Leaks", () => {
      const leaksUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}+leaks`;
      chrome.tabs.create({ url: leaksUrl });
    })
  );

  // 2. Réseaux sociaux & plateformes
  const socialSection = document.createElement("details");
  socialSection.className = "mb-2";
  const socialSummary = document.createElement("summary");
  socialSummary.textContent = "🔗 Réseaux sociaux & Plateformes";
  socialSection.appendChild(socialSummary);

  [
    ["Linktree", `https://linktr.ee/${encodeURIComponent(value)}`],
    ["OnlyFans", `https://onlyfans.com/${encodeURIComponent(value)}`],
    ["Fansly", `https://fansly.com/${encodeURIComponent(value)}`],
    ["Patreon", `https://www.patreon.com/${encodeURIComponent(value)}`],
  ].forEach(([label, url]) => {
    socialSection.appendChild(
      createButton(`🔗 ${label}`, () => chrome.tabs.create({ url }))
    );
  });

  // 3. Plateformes adultes
  const adultSection = document.createElement("details");
  adultSection.className = "mb-2";
  const adultSummary = document.createElement("summary");
  adultSummary.textContent = "🔎 Plateformes adultes";
  adultSection.appendChild(adultSummary);

  [
    ["Eporner", `https://www.eporner.com/search/${encodeURIComponent(value)}/`],
    [
      "Pornhub",
      `https://www.pornhub.com/video/search?search=${encodeURIComponent(value)}`,
    ],
    ["Xvideos", `https://www.xvideos.com/?k=${encodeURIComponent(value)}`],
    ["XVideos Red", `https://www.xvideos.red/?k=${encodeURIComponent(value)}`],
    ["XHamster", `https://xhamster.com/search/${encodeURIComponent(value)}`],
    ["SpankBang", `https://spankbang.com/s/${encodeURIComponent(value)}`],
    [
      "RedGIFs",
      `https://www.redgifs.com/search?q=${encodeURIComponent(value)}`,
    ],
  ].forEach(([label, url]) => {
    adultSection.appendChild(
      createButton(`🔎 ${label}`, () => chrome.tabs.create({ url }))
    );
  });

  actions.appendChild(socialSection);
  actions.appendChild(adultSection);

  // 4. Plateforme spécifique
  if (platform && username) {
    const profileUrls: [string, string][] = [
      ["Twitch", `https://twitch.tv/${username}`],
      ["Instagram", `https://instagram.com/${username}`],
      ["TikTok", `https://tiktok.com/@${username}`],
      ["Twitter", `https://twitter.com/${username}`],
      ["YouTube", `https://youtube.com/${username}`],
      ["Facebook", `https://facebook.com/${username}`],
      ["OnlyFans", `https://onlyfans.com/${username}`],
    ];

    // Récupérer l'URL actuelle pour éviter de proposer un bouton vers la même page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || "";
      // Filtrer les liens déjà ouverts
      const filtered = profileUrls.filter(([url]) => url !== currentUrl);

      if (filtered.length === 1) {
        // Un seul bouton, on l'affiche directement
        const [label, url] = filtered[0];
        actions.appendChild(
          createButton(`🌐 Open ${label}`, () => {
            chrome.tabs.create({ url });
          })
        );
      } else if (filtered.length > 1) {
        // Plusieurs options, menu déroulant
        const details = document.createElement("details");
        details.className = "mb-2";
        const summary = document.createElement("summary");
        summary.textContent = "🌐 Profils sur plateformes";
        details.appendChild(summary);

        filtered.forEach(([label, url]) => {
          details.appendChild(
            createButton(`🌐 Open ${label}`, () => {
              chrome.tabs.create({ url });
            })
          );
        });

        actions.appendChild(details);
      }
    });
  }

  // 5. Social Blade
  if (
    ["twitch", "instagram", "tiktok", "youtube", "twitter"].includes(
      platform || ""
    )
  ) {
    actions.appendChild(
      createButton("📊 Social Blade", () => {
        let sbUrl = "";
        switch (platform) {
          case "twitch":
            sbUrl = `https://socialblade.com/twitch/user/${username}`;
            break;
          case "instagram":
            sbUrl = `https://socialblade.com/instagram/user/${username}`;
            break;
          case "tiktok":
            sbUrl = `https://socialblade.com/tiktok/user/${username}`;
            break;
          case "youtube":
            sbUrl = `https://socialblade.com/youtube/${username}`;
            break;
          case "twitter":
            sbUrl = `https://socialblade.com/twitter/user/${username}`;
            break;
        }
        chrome.tabs.create({ url: sbUrl });
      })
    );
  }
}

// Pré-remplir si l'utilisateur est déjà sur une page de réseau social
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.url) {
    const { platform, username } = detectPlatform(tab.url);
    if (platform && username) {
      let prefill = "";
      switch (platform) {
        case "twitch":
          prefill = `https://twitch.tv/${username}`;
          break;
        case "instagram":
          prefill = `https://instagram.com/${username}`;
          break;
        case "tiktok":
          prefill = `https://tiktok.com/@${username}`;
          break;
        case "twitter":
          prefill = `https://twitter.com/${username}`;
          break;
        case "youtube":
          prefill = `https://youtube.com/${username}`;
          break;
        case "facebook":
          prefill = `https://facebook.com/${username}`;
          break;
        case "onlyfans":
          prefill = `https://onlyfans.com/${username}`;
          break;
      }
      input.value = prefill;
      renderButtons(platform, username);
      return;
    }
  }
  renderButtons(null, null);
});

// Mettre à jour les boutons quand l'utilisateur tape
input.addEventListener("input", () => {
  const { platform, username } = detectPlatform(input.value.trim());
  renderButtons(platform, username);
});

document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger-menu");
  const nav = document.getElementById("popup-nav");
  if (burger && nav) {
    burger.addEventListener("click", () => {
      nav.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (
        !burger.contains(e.target as Node) &&
        !nav.contains(e.target as Node)
      ) {
        nav.classList.add("hidden");
      }
    });
  }
});
