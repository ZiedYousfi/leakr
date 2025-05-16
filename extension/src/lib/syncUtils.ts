import { getAccessToken, getUserInfo } from "./authUtils";
import {
  syncState,
  setConflictState,
  setErrorState,
  setSyncStatus,
  type ParsedDbInfo,
} from "./syncStore";
import { get } from "svelte/store";

// Assumptions for dbUtils.ts:
// export async function getLocalDbDetails(): Promise<ParsedDbInfo | null>;
// export async function importNewDb(dbArrayBuffer: ArrayBuffer, newDbInfo: ParsedDbInfo): Promise<void>;
// export async function clearLocalDb(): Promise<void>; // Optional, if needed
import * as dbUtils from "./dbUtils"; // Assuming dbUtils.ts exists and exports these
import { STORAGE_SERVICE_BASE_URL } from "./config"; // Import from new config file

const FILENAME_REGEX =
  /^leakr_db_([0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})_(\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2})_it(\d+)\.sqlite$/;

interface RemoteFileInfo {
  filename: string; // Changed from 'name'
  userID: string; // Added based on API response/README
  timestamp: string; // Added based on API response/README (format "YYYY-MM-DD HH-MM-SS")
  iteration: string; // Added based on API response/README (e.g., "292")
  // Removed size and last_modified as they are not in the /info/user/{uuid} response
}

export function parseDbFilename(filename: string): ParsedDbInfo | null {
  const match = filename.match(FILENAME_REGEX);
  if (!match) {
    console.warn(`[syncUtils] Could not parse filename: ${filename}`);
    return null;
  }

  const [, uuid, timestampStr, iterationStr] = match;
  const iteration = parseInt(iterationStr, 10);

  // Parse timestamp "YYYY-MM-DD HH-MM-SS" into a Date object
  // Assuming UTC, replace space with T, and hyphens in time part with colons for ISO-like format if needed,
  // or parse manually for robustness.
  const parts = timestampStr.replace(" ", "-").split("-"); // [YYYY, MM, DD, HH, MM, SS]
  const dateObject = new Date(
    Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1, // Month is 0-indexed
      parseInt(parts[2], 10),
      parseInt(parts[3], 10),
      parseInt(parts[4], 10),
      parseInt(parts[5], 10)
    )
  );

  if (isNaN(dateObject.getTime())) {
    console.warn(`[syncUtils] Could not parse date from filename: ${filename}`);
    return null;
  }

  return {
    fullName: filename,
    uuid,
    timestamp: timestampStr,
    dateObject,
    iteration,
  };
}

// 変更: rename parameter for clarity
async function fetchRemoteDbInfo(
  userId: string,
  token: string
): Promise<ParsedDbInfo[]> {
  const url = `${STORAGE_SERVICE_BASE_URL}/info/user/${userId}`; // use leakr_uuid here
  console.log("[syncUtils] Fetching remote DB info from:", url);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[syncUtils] Error fetching remote DB info: ${response.status}`,
        errorBody
      );
      throw new Error(`Failed to fetch remote DB info: ${response.status}`);
    }

    const remoteFilesRaw: RemoteFileInfo[] = await response.json();
    console.log("[syncUtils] Raw remote files info:", remoteFilesRaw);

    if (!Array.isArray(remoteFilesRaw)) {
      console.error(
        "[syncUtils] Remote DB info is not an array:",
        remoteFilesRaw
      );
      return [];
    }

    return remoteFilesRaw
      .map((fileInfo) => {
        const parsed = parseDbFilename(fileInfo.filename); // Changed from fileInfo.name
        if (parsed) {
          // The 'parsed' object is already a complete ParsedDbInfo.
          // size and originalLastModified are optional in ParsedDbInfo
          // and will be undefined if not set, which is correct as this API endpoint
          // doesn't provide them.
          return parsed;
        }
        return null;
      })
      .filter(Boolean) as ParsedDbInfo[];
  } catch (error) {
    console.error(
      "[syncUtils] Exception fetching/parsing remote DB info:",
      error
    );
    setErrorState(
      error instanceof Error
        ? error.message
        : "Unknown error fetching remote DB info"
    );
    return [];
  }
}

export async function downloadAndApplyDb(
  dbInfoToImport: ParsedDbInfo,
  token: string
): Promise<void> {
  setSyncStatus("importing");
  const encodedName = encodeURIComponent(dbInfoToImport.fullName);
  const url = `${STORAGE_SERVICE_BASE_URL}/download/file/${encodedName}`;
  console.log("[syncUtils] Downloading DB from:", url);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[syncUtils] Error downloading DB: ${response.status}`,
        errorBody
      );
      throw new Error(
        `Failed to download DB ${dbInfoToImport.fullName}: ${response.status}`
      );
    }

    const dbArrayBuffer = await response.arrayBuffer();
    console.log("[syncUtils] DB downloaded, size:", dbArrayBuffer.byteLength);

    await dbUtils.importNewDb(dbArrayBuffer, dbInfoToImport);
    console.log(
      "[syncUtils] DB imported successfully:",
      dbInfoToImport.fullName
    );
    setSyncStatus("resolved", { conflictData: undefined });
  } catch (error) {
    console.error("[syncUtils] Exception downloading/applying DB:", error);
    setErrorState(
      error instanceof Error ? error.message : "Unknown error applying DB"
    );
  }
}

export async function synchronizeDatabase(): Promise<void> {
  console.log("[syncUtils] Starting database synchronization...");
  setSyncStatus("checking");

  const token = await getAccessToken();
  if (!token) {
    setErrorState("Not authenticated. Cannot sync.");
    // Or redirect to login, or set a specific auth-required status
    return;
  }

  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.sub) {
    setErrorState("User UUID not found. Cannot sync.");
    return;
  }

  // fetch the leakr_uuid from local storage
  const stored = await new Promise<{ leakr_uuid?: string }>((r) =>
    chrome.storage.local.get("leakr_uuid", (o) => r(o))
  );
  if (!stored.leakr_uuid) {
    setErrorState("Leakr UUID not found. Cannot sync.");
    return;
  }
  const userId = stored.leakr_uuid;

  let localDbInfo: ParsedDbInfo | null = null;
  try {
    localDbInfo = await dbUtils.getLocalDbDetails();

    if (localDbInfo && localDbInfo.timestamp) {
      // Ensure localDbInfo.dateObject is parsed consistently with remote filenames.
      // The localDbInfo.timestamp string should be in "YYYY-MM-DD HH-MM-SS" format.
      const ts = localDbInfo.timestamp;
      const parts = ts.replace(" ", "-").split("-");

      if (parts.length === 6 && parts.every((p) => /^\d+$/.test(p))) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date constructor
        const day = parseInt(parts[2], 10);
        const hour = parseInt(parts[3], 10);
        const minute = parseInt(parts[4], 10);
        const second = parseInt(parts[5], 10);

        const newDateObject = new Date(
          Date.UTC(year, month, day, hour, minute, second)
        );

        if (!isNaN(newDateObject.getTime())) {
          localDbInfo.dateObject = newDateObject;
        } else {
          console.warn(
            `[syncUtils] Failed to re-parse local DB timestamp string: ${ts}. Using dateObject from dbUtils, which might lead to inconsistencies.`
          );
          // Consider erroring or treating localDbInfo as invalid if strict consistency is paramount.
        }
      } else {
        console.warn(
          `[syncUtils] Local DB timestamp string from dbUtils is not in the expected format (YYYY-MM-DD HH-MM-SS): ${ts}. Using dateObject from dbUtils, which might lead to inconsistencies.`
        );
      }
    }
    console.log(
      "[syncUtils] Local DB details (dateObject potentially re-parsed):",
      localDbInfo
    );
  } catch (error) {
    console.error("[syncUtils] Error getting local DB details:", error);
    // Proceeding without local info, or could set error state
  }

  const remoteDbCandidates = await fetchRemoteDbInfo(userId, token);

  if (get(syncState).status === "error") {
    // fetchRemoteDbInfo might set error
    console.log(
      "[syncUtils] Error occurred during remote info fetch. Aborting sync."
    );
    return;
  }

  console.log("[syncUtils] Remote DB candidates:", remoteDbCandidates);

  if (remoteDbCandidates.length === 0) {
    console.log("[syncUtils] No remote DBs found.");
    setSyncStatus("resolved"); // Up-to-date or nothing to sync
    return;
  }

  if (remoteDbCandidates.length === 2) {
    console.log("[syncUtils] Conflict: Two remote candidates from service.");
    setConflictState({
      local: localDbInfo || undefined,
      remotes: remoteDbCandidates,
    });
    return;
  }

  // remoteDbCandidates.length === 1
  const bestRemote = remoteDbCandidates[0];

  if (!localDbInfo) {
    console.log("[syncUtils] No local DB found. Importing remote DB.");
    await downloadAndApplyDb(bestRemote, token);
    return;
  }

  // Compare localDbInfo with bestRemote
  const localTime = localDbInfo.dateObject.getTime();
  const remoteTime = bestRemote.dateObject.getTime();

  // Check for functional identity (same UUID, timestamp, iteration)
  if (
    localDbInfo.uuid === bestRemote.uuid &&
    localTime === remoteTime &&
    localDbInfo.iteration === bestRemote.iteration
  ) {
    console.log("[syncUtils] Local and remote DB are functionally identical.");
    setSyncStatus("resolved");
    return;
  }

  // Auto-import if remote is newer or same date with higher/equal iteration
  const isRemoteNewer = remoteTime > localTime;
  const isRemoteSameDateWithEqualOrBetterIteration =
    remoteTime === localTime && bestRemote.iteration >= localDbInfo.iteration;

  if (isRemoteNewer || isRemoteSameDateWithEqualOrBetterIteration) {
    console.log(
      "[syncUtils] Remote DB is considered newer or same with potentially higher/equal iteration. Importing remote DB."
    );
    await downloadAndApplyDb(bestRemote, token);
  } else {
    // Remote is older, or same date with fewer iterations.
    // This is a conflict: local is preferred by date/iteration, or they are divergent.
    console.log(
      "[syncUtils] Local DB is preferred by date/iteration, or remote does not meet auto-import criteria. Triggering conflict resolution."
    );
    setConflictState({ local: localDbInfo, remotes: [bestRemote] });
  }
}

// Call this function if user chooses local version in conflict resolution
export function resolveConflictWithLocal(): void {
  console.log("[syncUtils] User chose to keep local DB version.");
  setSyncStatus("resolved", { conflictData: undefined });
}

// Call this function if user chooses a remote version in conflict resolution
export async function resolveConflictWithRemote(
  chosenRemote: ParsedDbInfo
): Promise<void> {
  console.log("[syncUtils] User chose a remote DB version:", chosenRemote);
  const token = await getAccessToken();
  if (!token) {
    setErrorState("Not authenticated. Cannot import chosen DB.");
    return;
  }
  await downloadAndApplyDb(chosenRemote, token);
}

// Function to be called to initiate sync, perhaps on popup open or manually
export function triggerSync(): void {
  const currentStatus = get(syncState).status;
  if (currentStatus === "checking" || currentStatus === "importing") {
    console.log("[syncUtils] Sync already in progress.");
    return;
  }
  synchronizeDatabase().catch((err) => {
    console.error("[syncUtils] Unhandled error in synchronizeDatabase:", err);
    setErrorState(err instanceof Error ? err.message : "Unhandled sync error");
  });
}
