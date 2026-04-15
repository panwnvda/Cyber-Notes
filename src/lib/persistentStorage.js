const WORKSPACE_MARKER_KEY = 'redops_workspace_initialized';
const WORKSPACE_PREFIX = 'redops_';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function ensureWorkspaceBootstrap() {
  if (!canUseStorage()) return;

  try {
    if (window.localStorage.getItem(WORKSPACE_MARKER_KEY) === 'true') {
      return;
    }

    const keysToRemove = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(WORKSPACE_PREFIX) && key !== WORKSPACE_MARKER_KEY && key !== 'redops_welcome_modal_dismissed') {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

function readLocal(key) {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function reloadCache() {
  return undefined;
}

export async function persistGet(key) {
  return readLocal(key);
}

export async function persistSet(key, value) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(WORKSPACE_MARKER_KEY, 'true');
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('persistSet failed for', key, error);
  }
}

export async function persistDelete(key) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export async function migrateLocalStorage() {
  return undefined;
}

ensureWorkspaceBootstrap();
