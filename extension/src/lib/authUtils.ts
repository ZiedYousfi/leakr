import {
  CLIENT_ID,
  CLIENT_SECRET,
  AUTHORIZE_ENDPOINT,
  TOKEN_ENDPOINT,
  USERINFO_ENDPOINT,
  LEAKR_UUID_ENDPOINT,
  INTROSPECTION_ENDPOINT,
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
  console.log("authenticateWithClerk: Starting authentication process.");
  const redirectUri = getRedirectUri();
  const state = crypto.randomUUID();
  console.log(
    `authenticateWithClerk: redirectUri=${redirectUri}, state=${state}`
  );
  await new Promise<void>((r) =>
    chrome.storage.session.set({ oauth_state: state }, () => {
      console.log(
        `authenticateWithClerk: Stored oauth_state: ${state} in session storage.`
      );
      r();
    })
  );

  const authUrl =
    `${AUTHORIZE_ENDPOINT}` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log(
    `authenticateWithClerk: Launching web auth flow with URL: ${authUrl}`
  );
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectedTo) => {
        console.log(
          `authenticateWithClerk: Web auth flow callback. redirectedTo=${redirectedTo}`
        );
        if (chrome.runtime.lastError) {
          console.error(
            `authenticateWithClerk: Authorization failed: ${chrome.runtime.lastError.message}`
          );
          return reject(
            new Error(
              `Authorization failed: ${chrome.runtime.lastError.message}`
            )
          );
        }
        if (!redirectedTo) {
          console.error(
            "authenticateWithClerk: Redirection manquante après auth."
          );
          return reject(new Error("Redirection manquante après auth."));
        }

        const stored = await new Promise<{ oauth_state?: string }>((res) =>
          chrome.storage.session.get("oauth_state", (result) => {
            chrome.storage.session.remove("oauth_state", () => {
              console.log(
                "authenticateWithClerk: Removed oauth_state from session storage."
              );
              res(result);
            });
          })
        );
        console.log(
          `authenticateWithClerk: Retrieved stored oauth_state: ${stored.oauth_state}`
        );
        if (
          !stored.oauth_state ||
          new URL(redirectedTo).searchParams.get("state") !== stored.oauth_state
        ) {
          console.error("authenticateWithClerk: State OAuth invalide.");
          return reject(new Error("State OAuth invalide."));
        }

        const code = new URL(redirectedTo).searchParams.get("code");
        console.log(`authenticateWithClerk: Authorization code: ${code}`);
        if (!code) {
          console.error(
            "authenticateWithClerk: Pas de code d'autorisation retourné."
          );
          return reject(new Error("Pas de code d'autorisation retourné."));
        }

        try {
          console.log("authenticateWithClerk: Exchanging code for token.");
          await exchangeCodeForToken(code, redirectUri);
          console.log("authenticateWithClerk: Getting user info.");
          await getUserInfo();
          console.log("authenticateWithClerk: Authentication successful.");
          resolve();
        } catch (e) {
          console.error(
            "authenticateWithClerk: Error during token exchange or getting user info:",
            e
          );
          reject(e);
        }
      }
    );
  });
}

/* ----------------------------------------------------------- */
/* 3. Exchange code → tokens                                   */
/* ----------------------------------------------------------- */
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
  if (!resp.ok) throw new Error(`Échec échange code: ${resp.status}`);

  const { access_token, refresh_token } = await resp.json();
  console.log(
    `exchangeCodeForToken: Received access_token: ${access_token ? "present" : "absent"}, refresh_token: ${refresh_token ? "present" : "absent"}`
  );
  await storeTokens(access_token, refresh_token);
}

/* ----------------------------------------------------------- */
/* 4. Persistence                                              */
/* ----------------------------------------------------------- */
async function storeTokens(access: string, refresh: string): Promise<void> {
  console.log(
    `storeTokens: Storing access_token: ${access ? "present" : "absent"}, refresh_token: ${refresh ? "present" : "absent"}`
  );
  await new Promise<void>((r) =>
    chrome.storage.local.set(
      { access_token: access, refresh_token: refresh },
      () => {
        console.log("storeTokens: Tokens stored in local storage.");
        r();
      }
    )
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
      Authorization: `Basic ${creds}`,
    },
    body: body.toString(),
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
    refresh_token,
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
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
  if (!access) {
    console.log("getUserInfo: No access token found.");
    return null;
  }

  console.log("getUserInfo: Fetching user info from USERINFO_ENDPOINT.");
  const resp = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!resp.ok) {
    console.error(
      `getUserInfo: Failed to fetch user info, status: ${resp.status}`
    );
    return null;
  }

  const info: UserInfo = await resp.json();
  console.log("getUserInfo: User info received:", info);
  await new Promise<void>((r) =>
    chrome.storage.local.set({ user_info: info }, () => {
      console.log("getUserInfo: Stored user_info in local storage.");
      r();
    })
  );

  if (info.sub) {
    console.log(
      `getUserInfo: User sub found: ${info.sub}. Fetching leakr_uuid.`
    );
    const uuidEndpoint = LEAKR_UUID_ENDPOINT.replace(
      ":clerk_id",
      encodeURIComponent(info.sub)
    );
    const uuidResp = await fetch(uuidEndpoint, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (uuidResp.ok) {
      const { uuid } = await uuidResp.json();
      console.log(`getUserInfo: leakr_uuid received: ${uuid}`);
      await new Promise<void>((r) =>
        chrome.storage.local.set({ leakr_uuid: uuid }, () => {
          console.log("getUserInfo: Stored leakr_uuid in local storage.");
          r();
        })
      );
    } else {
      console.error(
        `getUserInfo: Failed to fetch leakr_uuid, status: ${uuidResp.status}`
      );
    }
  } else {
    console.log(
      "getUserInfo: No user sub found in user info, cannot fetch leakr_uuid."
    );
  }
  return info;
}

/* ----------------------------------------------------------- */
/* 9. Logout / Clear                                           */
/* ----------------------------------------------------------- */
export async function logout(): Promise<void> {
  const itemsToClear = [
    "access_token",
    "refresh_token",
    "user_info",
    "leakr_uuid",
  ];
  console.log(
    `logout: Attempting to remove items from local storage: ${itemsToClear.join(", ")}`
  );
  await new Promise<void>((r) =>
    chrome.storage.local.remove(itemsToClear, () => {
      console.log("logout: Items removed from local storage.");
      r();
    })
  );
  console.log("logout: Attempting to clear session storage.");
  await new Promise<void>((r) =>
    chrome.storage.session.clear(() => {
      console.log("logout: Session storage cleared.");
      r();
    })
  );
}

export async function clearAllStorage(): Promise<void> {
  console.log("clearAllStorage: Initiating clearing of all storage.");
  await logout(); // même nettoyage
  console.log("clearAllStorage: All storage cleared.");
}

/* ----------------------------------------------------------- */
