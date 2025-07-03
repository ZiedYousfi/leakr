import { writable } from "svelte/store";

export interface ParsedDbInfo {
  fullName: string;
  uuid: string;
  timestamp: string; // "YYYY-MM-DD HH-MM-SS"
  dateObject: Date;
  iteration: number;
  size?: number; // Optional: size for remote files
  originalLastModified?: string; // Optional: for remote files from R2 (ISO 8601 string)
}

export interface ConflictData {
  local?: ParsedDbInfo;
  remotes: ParsedDbInfo[]; // Could be 1 or 2 remotes in a conflict scenario
}

export type SyncStatus =
  | "idle"
  | "checking"
  | "authenticating"
  | "conflict"
  | "importing"
  | "resolved"
  | "error";

export interface SyncState {
  status: SyncStatus;
  conflictData?: ConflictData;
  error?: string;
  message?: string; // For user-facing messages during checking, importing, etc.
}

const initialState: SyncState = {
  status: "idle",
  conflictData: undefined,
  error: undefined,
  message: undefined,
};

export const syncState = writable<SyncState>(initialState);

export function resetSyncState() {
  syncState.set(initialState);
}

export function setConflictState(data: ConflictData) {
  syncState.set({
    status: "conflict",
    conflictData: data,
    error: undefined,
    message:
      "Database synchronization conflict detected. Please choose a version.",
  });
}

export function setErrorState(errorMessage: string) {
  syncState.set({
    status: "error",
    error: errorMessage,
    conflictData: undefined,
    message: undefined,
  });
}

// data can include message, error, conflictData if relevant to the new status
export function setSyncStatus(
  status: SyncStatus,
  data?: Partial<Omit<SyncState, "status">>
) {
  syncState.update(() => {
    // Removed unused 'currentState' parameter
    // Start with a clean slate for error/conflictData/message based on initialState
    const newState: SyncState = {
      ...initialState,
      status: status, // Set the new status
    };
    // Then, merge any explicitly provided data for the new state
    if (data) {
      // If data contains 'error: undefined', it will clear previous errors.
      // If data contains 'conflictData: undefined', it will clear previous conflicts.
      Object.assign(newState, data);
    }
    return newState;
  });
}
