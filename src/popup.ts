const input = document.getElementById("twitch-link") as HTMLInputElement;
const actions = document.getElementById("actions") as HTMLDivElement;

function getChannelFromUrl(url: string): string | null {
  const match = url.match(/twitch\.tv\/([\w\d_]+)/i);
  return match ? match[1] : null;
}

function createButton(label: string, onClick: () => void) {
  const btn = document.createElement("button");
  btn.className = "flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7E5BEF] hover:bg-[#a18aff] text-white font-mono font-semibold shadow-md transition";
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

function renderButtons(channel: string | null) {
  actions.innerHTML = "";
  const value = channel || input.value.trim();
  if (value) {
    actions.appendChild(createButton("🔍 Simple Google Search", () => {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
      chrome.tabs.create({ url: searchUrl });
    }));
    actions.appendChild(createButton("🔍 KBJ Free", () => {
      const searchUrl = `https://www.kbjfree.com/search?q=${encodeURIComponent(value)}`;
      chrome.tabs.create({ url: searchUrl });
    }));
    actions.appendChild(createButton("🕵️‍♂️ Find Leaks", () => {
      const leaksUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}+leaks`;
      chrome.tabs.create({ url: leaksUrl });
    }));
  }
}

// Pré-remplir si l'utilisateur est déjà sur une page Twitch
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.url) {
    const channel = getChannelFromUrl(tab.url);
    if (channel) {
      input.value = `https://twitch.tv/${channel}`;
      renderButtons(channel);
      return;
    }
  }
  renderButtons(null);
});

// Mettre à jour les boutons quand l'utilisateur tape
input.addEventListener("input", () => {
  renderButtons(null);
});
