const input = document.getElementById("twitch-link") as HTMLInputElement;
const button = document.getElementById("search-btn") as HTMLButtonElement;

button.addEventListener("click", () => {
  const url = input.value.trim();
  const match = url.match(/twitch\.tv\/([\w\d_]+)/i);
  if (match) {
    const channel = match[1];
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(channel)}`;
    chrome.tabs.create({ url: searchUrl });
  } else {
    alert("Lien Twitch invalide 🥺");
  }
});
