// authUtils.ts

import { CLIENT_ID, CLIENT_SECRET, AUTHORIZE_ENDPOINT, TOKEN_ENDPOINT} from './authVars';

// 1. Génére l'URI de redirection pour chrome.identity
export function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

// 2. Lance le flow OIDC avec Clerk
export async function authenticateWithClerk(): Promise<void> {
  const redirectUri = getRedirectUri();
  console.log("Generated Redirect URI:", redirectUri); // Added logging

  const authUrl = `${AUTHORIZE_ENDPOINT}` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log("Attempting Auth URL:", authUrl); // Added logging

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectedTo) => {
        if (chrome.runtime.lastError) {
          // Log more details if lastError is present
          console.error(
            "chrome.identity.launchWebAuthFlow error:",
            chrome.runtime.lastError.message
          );
          console.error("Auth URL that failed:", authUrl);
          return reject(
            new Error(
              `Authorization failed: ${chrome.runtime.lastError.message}. Check console for Auth URL and Redirect URI.`
            )
          );
        }
        if (!redirectedTo) {
          console.error(
            "chrome.identity.launchWebAuthFlow: No redirect URI received after auth flow."
          );
          console.error("Auth URL attempted:", authUrl);
          return reject(
            new Error(
              "Aucun redirect URI reçu après le flux d'authentification."
            )
          );
        }
        const urlObj = new URL(redirectedTo);
        const code = urlObj.searchParams.get('code');
        if (!code) {
          return reject(new Error("Pas de code dans la réponse"));
        }
        try {
          await exchangeCodeForToken(code, redirectUri);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// 3. Échange le code contre access_token + refresh_token
async function exchangeCodeForToken(code: string, redirectUri: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri:  redirectUri,
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Échec du token: ${err}`);
  }

  const { access_token, refresh_token } = await resp.json();
  await storeTokens(access_token, refresh_token);
}

// 4. Stocke les tokens dans chrome.storage.local
async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  return new Promise((res) => {
    chrome.storage.local.set({ access_token: accessToken, refresh_token: refreshToken }, () => res());
  });
}

// 5. Récupère l'access_token pour tes appels API
export async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['access_token'], (result) => {
      resolve(result.access_token || null);
    });
  });
}

// 6. Optionnel: rafraîchir le token quand expiré
export async function refreshAccessToken(): Promise<void> {
  const data = await new Promise<{refresh_token?: string}>(res => {
    chrome.storage.local.get(['refresh_token'], r => res(r));
  });
  const refreshToken = data.refresh_token;
  if (!refreshToken) throw new Error("Pas de refresh_token disponible");

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Échec refresh: ${err}`);
  }

  const { access_token, refresh_token } = await resp.json();
  await storeTokens(access_token, refresh_token);
}

// 7. Vérifie le statut d'authentification
export async function checkAuthStatus(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

// 8. Déconnexion
export async function logout(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['access_token', 'refresh_token'], () => {
      resolve();
    });
  });
}
