import {
  AUTH_SERVICE_BASE_URL,
  CLIENT_ID,
  AUTHORIZE_ENDPOINT,
  LEAKR_UUID_ENDPOINT,
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
  // PKCE Challenge (S256)
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID(); // Generate a random string for the verifier
  const codeChallengeBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = btoa(
    String.fromCharCode(...new Uint8Array(codeChallengeBuffer))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  console.log(
    `authenticateWithClerk: redirectUri=${redirectUri}, state=${state}, code_verifier (length)=${codeVerifier.length}, code_challenge=${codeChallenge}`
  );

  await new Promise<void>((resolve, reject) =>
    chrome.storage.session.set(
      { oauth_state: state, oauth_code_verifier: codeVerifier },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "authenticateWithClerk: Error saving state/verifier to session storage:",
            chrome.runtime.lastError.message
          );
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log(
            "authenticateWithClerk: oauth_state and oauth_code_verifier saved to session storage."
          );
          resolve();
        }
      }
    )
  );

  const authUrl = new URL(AUTHORIZE_ENDPOINT);
  authUrl.searchParams.append("client_id", CLIENT_ID);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "openid profile email"); // Removed offline_access
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");

  console.log(
    `authenticateWithClerk: Launching web auth flow with URL: ${authUrl.toString()}`
  );

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      async (responseUrl?: string) => {
        if (chrome.runtime.lastError) {
          console.error(
            "authenticateWithClerk: Web auth flow failed:",
            chrome.runtime.lastError.message
          );
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!responseUrl) {
          console.error(
            "authenticateWithClerk: No response URL from auth flow."
          );
          reject(new Error("Authentication failed: No response URL"));
          return;
        }

        console.log(
          `authenticateWithClerk: Web auth flow successful. Response URL: ${responseUrl}`
        );
        const url = new URL(responseUrl);
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");

        const stored = await new Promise<{
          oauth_state?: string;
          oauth_code_verifier?: string;
        }>((r) =>
          chrome.storage.session.get(
            ["oauth_state", "oauth_code_verifier"],
            (items) => r(items)
          )
        );

        if (stored.oauth_state !== returnedState) {
          console.error(
            `authenticateWithClerk: State mismatch. Expected ${stored.oauth_state}, got ${returnedState}`
          );
          reject(new Error("State mismatch during authentication."));
          return;
        }

        if (!code) {
          console.error("authenticateWithClerk: No code in response URL.");
          reject(new Error("Authentication failed: No code in response URL"));
          return;
        }
        if (!stored.oauth_code_verifier) {
          console.error(
            "authenticateWithClerk: No code_verifier in session storage."
          );
          reject(
            new Error("Authentication critical error: Missing code_verifier.")
          );
          return;
        }

        console.log(
          `authenticateWithClerk: Code received: ${code}. Exchanging for token.`
        );
        try {
          await exchangeCodeForToken(
            code,
            redirectUri,
            stored.oauth_code_verifier
          );
          console.log(
            "authenticateWithClerk: Authentication process completed successfully."
          );
          resolve();
        } catch (error) {
          console.error("authenticateWithClerk: Token exchange failed:", error);
          reject(error);
        }
      }
    );
  });
}

/* ----------------------------------------------------------- */
/* 3. Exchange code → tokens (via Auth Service)                */
/* ----------------------------------------------------------- */
async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<void> {
  console.log(
    `exchangeCodeForToken: Exchanging code ${code} using redirectUri ${redirectUri} and verifier.`
  );
  const exchangeUrl = `${AUTH_SERVICE_BASE_URL}/oauth/exchange-code`;

  try {
    const resp = await fetch(exchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier, // Send code_verifier to auth-service
      }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error(
        `exchangeCodeForToken: Failed to exchange code. Status: ${resp.status}. Body: ${errorBody}`
      );
      throw new Error(
        `Token exchange failed with status ${resp.status}: ${errorBody}`
      );
    }

    const tokenData = await resp.json();
    console.log("exchangeCodeForToken: Tokens received:", tokenData);

    if (!tokenData.access_token) {
      console.error(
        "exchangeCodeForToken: access_token missing in response from auth-service."
      );
      throw new Error("access_token missing in response from auth-service");
    }

    await storeTokens(tokenData.access_token, tokenData.refresh_token); // Pass refresh_token, might be undefined
    console.log("exchangeCodeForToken: Tokens stored successfully.");
  } catch (error) {
    console.error("exchangeCodeForToken: Error during token exchange:", error);
    // Clear potentially partial/invalid tokens if exchange fails mid-way
    await chrome.storage.local.remove(["access_token", "refresh_token"]);
    throw error; // Re-throw to be caught by authenticateWithClerk
  }
}

/* ----------------------------------------------------------- */
/* 4. Persistence                                              */
/* ----------------------------------------------------------- */
async function storeTokens(access: string, refresh?: string): Promise<void> {
  // Made refresh optional
  console.log(
    `storeTokens: Storing access_token: ${access ? "present" : "absent"}, refresh_token: ${refresh ? "present" : "absent"}`
  );
  const itemsToStore: { access_token: string; refresh_token?: string } = {
    access_token: access,
  };
  if (refresh) {
    itemsToStore.refresh_token = refresh;
  }
  await new Promise<void>((r) =>
    chrome.storage.local.set(itemsToStore, () => {
      console.log("storeTokens: Tokens stored in local storage.");
      r();
    })
  );
}

export async function getAccessToken(): Promise<string | null> {
  return new Promise((r) =>
    chrome.storage.local.get("access_token", (o) => r(o.access_token || null))
  );
}

/* ----------------------------------------------------------- */
/* 5. Introspection RFC-7662 (via Auth Service)                */
/* ----------------------------------------------------------- */
async function introspectToken(token: string): Promise<boolean> {
  console.log(`introspectToken: Introspecting token.`);
  const verifyUrl = `${AUTH_SERVICE_BASE_URL}/verify`;

  try {
    const resp = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      // Log specific error from auth-service if available
      const errorBody = await resp.text();
      console.warn(
        `introspectToken: Token introspection failed. Status: ${resp.status}. Body: ${errorBody}`
      );
      return false;
    }

    const introspectionResult = await resp.json();
    console.log("introspectToken: Introspection result:", introspectionResult);
    return introspectionResult.active === true; // Ensure it explicitly checks for true
  } catch (error) {
    console.error("introspectToken: Error during token introspection:", error);
    return false;
  }
}

/* ----------------------------------------------------------- */
/* 6. Refresh access_token (via Auth Service)                  */
/* ----------------------------------------------------------- */
export async function refreshAccessToken(): Promise<void> {
  console.log("refreshAccessToken: Attempting to refresh access token.");
  const { refresh_token } = await new Promise<{ refresh_token?: string }>((r) =>
    chrome.storage.local.get("refresh_token", (o) => r(o))
  );

  if (!refresh_token) {
    console.warn(
      "refreshAccessToken: No refresh token found. Cannot refresh. This is expected if 'offline_access' scope was not granted."
    );
    throw new Error("No refresh token available to refresh access token.");
  }

  console.log(
    "refreshAccessToken: Refresh token found. Proceeding with refresh."
  );
  const refreshUrl = `${AUTH_SERVICE_BASE_URL}/oauth/refresh-token`;

  try {
    const resp = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error(
        `refreshAccessToken: Failed to refresh token. Status: ${resp.status}. Body: ${errorBody}`
      );
      // If refresh fails (e.g. refresh token expired/revoked), clear tokens and force re-auth
      if (resp.status === 400 || resp.status === 401) {
        console.log(
          "refreshAccessToken: Clearing tokens due to refresh failure."
        );
        await clearAllStorage(); // Or at least clear access/refresh tokens
      }
      throw new Error(
        `Token refresh failed with status ${resp.status}: ${errorBody}`
      );
    }

    const tokenData = await resp.json();
    console.log("refreshAccessToken: New tokens received:", tokenData);

    if (!tokenData.access_token) {
      console.error(
        "refreshAccessToken: access_token missing in response from auth-service after refresh."
      );
      throw new Error(
        "access_token missing in response from auth-service after refresh"
      );
    }

    await storeTokens(tokenData.access_token, tokenData.refresh_token); // Pass refresh_token, might be undefined
    console.log("refreshAccessToken: New tokens stored successfully.");
  } catch (error) {
    console.error("refreshAccessToken: Error during token refresh:", error);
    throw error; // Re-throw to be handled by caller
  }
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

  console.log("getUserInfo: Fetching user info via auth-service proxy.");
  // Call the new proxy endpoint on your auth-service
  const userInfoProxyUrl = `${AUTH_SERVICE_BASE_URL}/oauth/userinfo-proxy`;
  const resp = await fetch(userInfoProxyUrl, {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    console.error(
      `getUserInfo: Failed to fetch user info from auth-service proxy, status: ${resp.status}, body: ${errorBody}`
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

      // Store leakr_uuid in local storage
      await new Promise<void>((r) =>
        chrome.storage.local.set({ leakr_uuid: uuid }, () => {
          console.log("getUserInfo: Stored leakr_uuid in local storage.");
          r();
        })
      );

      // Update the UUID in the database settings only if different
      try {
        // Get current UUID from database
        const currentSettings = await import("./dbUtils").then((m) =>
          m.getSettings()
        );
        const currentUuid = currentSettings?.uuid;

        if (currentUuid !== uuid) {
          await import("./dbUtils").then((m) => m.updateUUID(uuid));
          console.log(
            `getUserInfo: Updated leakr_uuid in database settings from "${currentUuid}" to "${uuid}"`
          );
        } else {
          console.log(
            `getUserInfo: leakr_uuid in database already matches "${uuid}", skipping update.`
          );
        }
      } catch (dbError) {
        console.error(
          "getUserInfo: Failed to update leakr_uuid in database settings:",
          dbError
        );
      }
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
