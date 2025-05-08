import {
  CLIENT_ID,
  CLIENT_SECRET,
  AUTHORIZE_ENDPOINT,
  TOKEN_ENDPOINT,
  USERINFO_ENDPOINT, // Ensure USERINFO_ENDPOINT is defined in authVars.ts
} from "./authVars";

// 1. Génére l'URI de redirection pour chrome.identity
export function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

// 2. Lance le flow OIDC avec Clerk
export async function authenticateWithClerk(): Promise<void> {
  const redirectUri = getRedirectUri();
  console.log("Generated Redirect URI:", redirectUri);

  // Génére et stocke le paramètre state
  const state = crypto.randomUUID();
  await new Promise<void>((resolve) =>
    chrome.storage.session.set({ oauth_state: state }, resolve)
  );
  console.log("Generated and stored OAuth state:", state);

  const authUrl =
    `${AUTHORIZE_ENDPOINT}` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;
  console.log("Attempting Auth URL:", authUrl);

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectedTo) => {
        // Récupération et suppression du state stocké
        const stored = await new Promise<{ oauth_state?: string }>((res) =>
          chrome.storage.session.get("oauth_state", (result) => {
            chrome.storage.session.remove("oauth_state");
            res(result);
          })
        );
        const storedState = stored.oauth_state;

        if (chrome.runtime.lastError) {
          console.error("Auth flow error:", chrome.runtime.lastError.message);
          return reject(
            new Error(
              `Authorization failed: ${chrome.runtime.lastError.message}`
            )
          );
        }
        if (!redirectedTo) {
          return reject(
            new Error(
              "Aucun redirect URI reçu après le flux d'authentification."
            )
          );
        }

        const urlObj = new URL(redirectedTo);
        const code = urlObj.searchParams.get("code");
        const receivedState = urlObj.searchParams.get("state");

        // Vérification du state
        if (!storedState || receivedState !== storedState) {
          return reject(
            new Error(
              "Erreur de sécurité : la correspondance de l'état OAuth a échoué."
            )
          );
        }

        // Vérification des erreurs OAuth dans l'URL
        const errorParam = urlObj.searchParams.get("error");
        if (errorParam) {
          const desc = urlObj.searchParams.get("error_description");
          return reject(
            new Error(`OAuth error: ${errorParam}${desc ? ` - ${desc}` : ""}`)
          );
        }

        if (!code) {
          return reject(
            new Error(
              "Pas de code dans la réponse. Vérifiez la configuration du Redirect URI dans Clerk."
            )
          );
        }

        try {
          // Échange le code et récupère les tokens
          await exchangeCodeForToken(code, redirectUri);
          // Après obtention des tokens, récupère et stocke les infos utilisateur
          await getUserInfo();
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// Helper: décode le payload JWT
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// 3. Échange le code contre tokens
async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<void> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Échec du token: ${resp.status} - ${text}`);
  }

  const { access_token, refresh_token, id_token } = await resp.json();
  let userId: string | null = null;
  if (id_token) {
    const payload = decodeJwtPayload(id_token);
    if (payload && typeof payload.sub === "string") {
      userId = payload.sub;
    } else {
      userId = null;
    }
  }
  await storeTokens(access_token, refresh_token, userId);
}

// 4. Stocke tokens et userId
async function storeTokens(
  accessToken: string,
  refreshToken: string,
  userId: string | null
): Promise<void> {
  const items: Record<string, string> = {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
  if (userId) items.user_id = userId;
  return new Promise((res) => chrome.storage.local.set(items, res));
}

// 5. Obtient l'access_token
export async function getAccessToken(): Promise<string | null> {
  return new Promise((res) =>
    chrome.storage.local.get(["access_token"], (r) =>
      res(r.access_token || null)
    )
  );
}

// 6. Rafraîchir le token
export async function refreshAccessToken(): Promise<void> {
  const { refresh_token } = await new Promise<{ refresh_token?: string }>(
    (res) => chrome.storage.local.get(["refresh_token"], (r) => res(r))
  );
  if (!refresh_token) throw new Error("Pas de refresh_token disponible");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token,
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Échec refresh: ${resp.status} - ${txt}`);
  }
  const {
    access_token,
    refresh_token: newRefresh,
    id_token,
  } = await resp.json();
  let userId: string | null = null;
  if (id_token) {
    const payload = decodeJwtPayload(id_token);
    if (payload && typeof payload.sub === "string") {
      userId = payload.sub;
    } else {
      userId = null;
    }
  }
  await storeTokens(access_token, newRefresh, userId);
}

// 7. Vérifie le statut d'authentification
export async function checkAuthStatus(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

// 8. Déconnexion
export async function logout(): Promise<void> {
  return new Promise((res) =>
    chrome.storage.local.remove(
      ["access_token", "refresh_token", "user_id", "user_info"],
      res
    )
  );
}

// 9. Interface pour UserInfo
export interface UserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  preferred_username?: string;
  locale?: string;
  updated_at?: number;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// 10. Récupère les infos utilisateur depuis /oauth/userinfo
export async function getUserInfo(): Promise<UserInfo | null> {
  const token = await getAccessToken();
  if (!token) {
    console.warn("No access token available.");
    return null;
  }

  try {
    const resp = await fetch(USERINFO_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to fetch user info: ${resp.status} - ${text}`);
    }

    const info: UserInfo = await resp.json();
    // Stockage local des infos utilisateur
    await new Promise<void>((res) =>
      chrome.storage.local.set({ user_info: info }, res)
    );
    console.log("User info stored:", info);
    return info;
  } catch (e) {
    console.error("Error fetching user info:", e);
    return null;
  }
}
