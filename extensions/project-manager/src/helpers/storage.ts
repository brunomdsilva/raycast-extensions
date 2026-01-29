import { LocalStorage } from "@raycast/api";
import { ProjectMeta, SortMode } from "../utils/types";

const STORAGE_KEY = "projectPaths";
const META_KEY = "projectMeta";
const SORT_MODE_KEY = "sortMode";

export async function getStoredPaths(): Promise<string[]> {
  const json = await LocalStorage.getItem<string>(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addStoredPath(path: string): Promise<string[]> {
  const paths = await getStoredPaths();
  if (!paths.includes(path)) {
    paths.push(path);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  }
  return paths;
}

export async function removeStoredPath(path: string): Promise<string[]> {
  const paths = (await getStoredPaths()).filter((p) => p !== path);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  return paths;
}

// --- Project meta (ranking & pins) ---

async function getAllMeta(): Promise<Record<string, ProjectMeta>> {
  const json = await LocalStorage.getItem<string>(META_KEY);
  return json ? JSON.parse(json) : {};
}

async function saveMeta(meta: Record<string, ProjectMeta>): Promise<void> {
  await LocalStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function getProjectMeta(
  projectPath: string,
): Promise<ProjectMeta> {
  const meta = await getAllMeta();
  return meta[projectPath] ?? { openCount: 0, pinned: false };
}

export async function getAllProjectMeta(): Promise<
  Record<string, ProjectMeta>
> {
  return getAllMeta();
}

export async function incrementOpenCount(projectPath: string): Promise<void> {
  const meta = await getAllMeta();
  const current = meta[projectPath] ?? { openCount: 0, pinned: false };
  current.openCount += 1;
  current.lastOpenedAt = Date.now();
  meta[projectPath] = current;
  await saveMeta(meta);
}

export async function togglePin(projectPath: string): Promise<boolean> {
  const meta = await getAllMeta();
  const current = meta[projectPath] ?? { openCount: 0, pinned: false };
  current.pinned = !current.pinned;
  meta[projectPath] = current;
  await saveMeta(meta);
  return current.pinned;
}

export async function resetRanking(projectPath: string): Promise<void> {
  const meta = await getAllMeta();
  const current = meta[projectPath];
  if (current) {
    current.openCount = 0;
    meta[projectPath] = current;
    await saveMeta(meta);
  }
}

// --- Sort mode ---

export async function getSortMode(): Promise<SortMode> {
  const value = await LocalStorage.getItem<string>(SORT_MODE_KEY);
  return (value as SortMode) ?? "frequency";
}

export async function setSortMode(mode: SortMode): Promise<void> {
  await LocalStorage.setItem(SORT_MODE_KEY, mode);
}

// --- Manual reordering ---

export async function moveProject(
  projectPath: string,
  direction: "up" | "down",
  sortedPaths: string[],
): Promise<void> {
  const index = sortedPaths.indexOf(projectPath);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sortedPaths.length) return;

  const meta = await getAllMeta();
  const currentMeta = meta[projectPath] ?? { openCount: 0, pinned: false };
  const swapMeta = meta[sortedPaths[swapIndex]] ?? {
    openCount: 0,
    pinned: false,
  };

  const tempOrder = currentMeta.manualOrder ?? index;
  currentMeta.manualOrder = swapMeta.manualOrder ?? swapIndex;
  swapMeta.manualOrder = tempOrder;

  meta[projectPath] = currentMeta;
  meta[sortedPaths[swapIndex]] = swapMeta;
  await saveMeta(meta);
}
