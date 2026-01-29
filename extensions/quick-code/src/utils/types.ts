import { Application } from "@raycast/api";

export interface Project {
  name: string;
  path: string;
}

export type SortMode = "frequency" | "manual" | "alphabetical" | "recent";

export interface ProjectMeta {
  openCount: number;
  pinned: boolean;
  manualOrder?: number;
  lastOpenedAt?: number;
}

export interface Preferences {
  mainEditor?: Application;
  mainTerminal?: Application;
}
