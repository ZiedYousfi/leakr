import {
  CLIENT_ID,
  CLIENT_SECRET,
  AUTHORIZE_ENDPOINT,
  TOKEN_ENDPOINT,
  USERINFO_ENDPOINT,
  LEAKR_UUID_ENDPOINT,
  INTROSPECTION_ENDPOINT
} from "./authVars";

/* ----------------------------------------------------------- */
/* 1. Redirect URI                                             */
/* ----------------------------------------------------------- */
export function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

/* ----------------------------------------------------------- */
/* 2. Authenticate with Clerk (OIDC Authorization Code + PKCE) */
/* ----------------------------------------------------------- */
export async function authenticateWithClerk(): Promise<void> {
  const redirectUri = getRedirectUri();
  const state = crypto.randomUUID();
  await new Promise<void>((r) =>
    chrome.storage.session.set({ oauth_state: state }, r)
  );

  const authUrl =
    `${AUTHORIZE_ENDPOINT}` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectedTo) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(`Authorization failed: ${chrome.runtime.lastError.message}`));
      }
      if (!redirectedTo) return reject(new Error("Redirection manquante après auth."));

      const stored = await new Promise<{ oauth_state?: string }>((res) =>
        chrome.storage.session.get("oauth_state", (result) => {
          chrome.storage.session.remove("oauth_state");
          res(result);
        })
      );
      if (!stored.oauth_state || new URL(redirectedTo).searchParams.get("state") !== stored.oauth_state) {
        return reject(new Error("State OAuth invalide."));
      }

      const code = new URL(redirectedTo).searchParams.get("code");
      if (!code) return reject(new Error("Pas de code d'autorisation retourné."));

      try {
        await exchangeCodeForToken(code, redirectUri);
        await getUserInfo();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

/* ----------------------------------------------------------- */
/* 3. Exchange code → tokens                                   */
/* ----------------------------------------------------------- */
async function exchangeCodeForToken(code: string, redirectUri: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: redirectUri
  });

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!resp.ok) throw new Error(`Échec échange code: ${resp.status}`);

  const { access_token, refresh_token } = await resp.json();
  await storeTokens(access_token, refresh_token);
}

/* ----------------------------------------------------------- */
/* 4. Persistence                                              */
/* ----------------------------------------------------------- */
async function storeTokens(access: string, refresh: string): Promise<void> {
  await new Promise<void>((r) =>
    chrome.storage.local.set({ access_token: access, refresh_token: refresh }, r)
  );
}

export async function getAccessToken(): Promise<string | null> {
  return new Promise((r) =>
    chrome.storage.local.get("access_token", (o) => r(o.access_token || null))
  );
}

/* ----------------------------------------------------------- */
/* 5. Introspection RFC-7662                                   */
/* ----------------------------------------------------------- */
async function introspectToken(token: string): Promise<boolean> {
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const body = new URLSearchParams({ token, token_type_hint: "access_token" });

  const resp = await fetch(INTROSPECTION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`
    },
    body: body.toString()
  });
  if (!resp.ok) return false;
  const { active } = await resp.json();
  return active === true;
}

/* ----------------------------------------------------------- */
/* 6. Refresh access_token                                     */
/* ----------------------------------------------------------- */
export async function refreshAccessToken(): Promise<void> {
  const { refresh_token } = await new Promise<{ refresh_token?: string }>((r) =>
    chrome.storage.local.get("refresh_token", (o) => r(o))
  );
  if (!refresh_token) throw new Error("Aucun refresh_token.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!resp.ok) throw new Error(`Refresh failed: ${resp.status}`);
  const { access_token, refresh_token: newRefresh } = await resp.json();
  await storeTokens(access_token, newRefresh);
}

/* ----------------------------------------------------------- */
/* 7. Auth status                                              */
/* ----------------------------------------------------------- */
export async function checkAuthStatus(): Promise<boolean> {
  const token = await getAccessToken();
  return token ? introspectToken(token) : false;
}

/* ----------------------------------------------------------- */
/* 8. UserInfo + leakr_uuid                                    */
/* ----------------------------------------------------------- */
export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  [k: string]: unknown;
}

export async function getUserInfo(): Promise<UserInfo | null> {
  const access = await getAccessToken();
  if (!access) return null;

  const resp = await fetch(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${access}` } });
  if (!resp.ok) return null;

  const info: UserInfo = await resp.json();
  await new Promise<void>((r) => chrome.storage.local.set({ user_info: info }, r));

  if (info.sub) {
    const uuidEndpoint = LEAKR_UUID_ENDPOINT.replace(":clerk_id", encodeURIComponent(info.sub));
    const uuidResp = await fetch(uuidEndpoint, { headers: { Authorization: `Bearer ${access}` } });
    if (uuidResp.ok) {
      const { uuid } = await uuidResp.json();
      await new Promise<void>((r) => chrome.storage.local.set({ leakr_uuid: uuid }, r));
    }
  }
  return info;
}

/* ----------------------------------------------------------- */
/* 9. Logout / Clear                                           */
/* ----------------------------------------------------------- */
export async function logout(): Promise<void> {
  await new Promise<void>((r) =>
    chrome.storage.local.remove(
      ["access_token", "refresh_token", "user_info", "leakr_uuid"],
      r
    )
  );
  await new Promise<void>((r) => chrome.storage.session.clear(r));
}

export async function clearAllStorage(): Promise<void> {
  await logout(); // même nettoyage
}

/* ----------------------------------------------------------- */
