import fs from "fs";
import path from "path";
import os from "os";
import { Project } from "../utils/types";

export function getProjects(projectPaths: string[]): Project[] {
  const paths = projectPaths.map((p) => p.trim()).filter((p) => p.length > 0);

  const projects: Project[] = [];
  const seen = new Set<string>();

  for (const raw of paths) {
    const expanded = expandPath(raw);

    if (expanded.endsWith("/*")) {
      const dir = expanded.slice(0, -2);
      const subdirs = listSubdirectories(dir);
      for (const sub of subdirs) {
        if (!seen.has(sub.path)) {
          seen.add(sub.path);
          projects.push(sub);
        }
      }
    } else {
      if (!seen.has(expanded) && isDirectory(expanded)) {
        seen.add(expanded);
        projects.push({
          name: path.basename(expanded),
          path: expanded,
        });
      }
    }
  }

  return projects.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function getBaseDirectories(projectPaths: string[]): string[] {
  const paths = projectPaths.map((p) => p.trim()).filter((p) => p.length > 0);

  const dirs: string[] = [];

  for (const raw of paths) {
    const expanded = expandPath(raw);
    const dir = expanded.endsWith("/*") ? expanded.slice(0, -2) : expanded;

    if (isDirectory(dir) && !dirs.includes(dir)) {
      dirs.push(dir);
    }
  }

  return dirs;
}

function expandPath(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function listSubdirectories(dir: string): Project[] {
  if (!isDirectory(dir)) return [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => ({
        name: e.name,
        path: path.join(dir, e.name),
      }));
  } catch {
    return [];
  }
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
