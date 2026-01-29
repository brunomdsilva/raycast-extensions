import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  trash,
} from "@raycast/api";
import { useEffect, useState } from "react";
import CreateProject from "./create-project";
import { getProjects } from "./helpers/projects";
import {
  getAllProjectMeta,
  getSortMode,
  getStoredPaths,
  incrementOpenCount,
  moveProject,
  resetRanking,
  setSortMode,
  togglePin,
} from "./helpers/storage";
import ManagePaths from "./manage-paths";
import { SORT_MODES } from "./utils/consts";
import { Project, ProjectMeta, SortMode } from "./utils/types";

export default function ManageProjects() {
  const preferences = getPreferenceValues<Preferences>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<Record<string, ProjectMeta>>({});
  const [sortMode, setSortModeState] = useState<SortMode>("frequency");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setIsLoading(true);
      const [paths, allMeta, mode] = await Promise.all([
        getStoredPaths(),
        getAllProjectMeta(),
        getSortMode(),
      ]);
      setProjects(getProjects(paths));
      setMeta(allMeta);
      setSortModeState(mode);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSortChange(value: string) {
    const mode = value as SortMode;
    if (mode === sortMode) return;
    setSortModeState(mode);
    await setSortMode(mode);
  }

  function sortedProjects(): Project[] {
    return [...projects].sort((a, b) => {
      const ma = meta[a.path] ?? { openCount: 0, pinned: false };
      const mb = meta[b.path] ?? { openCount: 0, pinned: false };

      // Pinned always first
      if (ma.pinned !== mb.pinned) return ma.pinned ? -1 : 1;

      switch (sortMode) {
        case "manual": {
          const oa = ma.manualOrder ?? Infinity;
          const ob = mb.manualOrder ?? Infinity;
          if (oa !== ob) return oa - ob;
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        }
        case "alphabetical":
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        case "recent": {
          const ta = ma.lastOpenedAt ?? 0;
          const tb = mb.lastOpenedAt ?? 0;
          if (ta !== tb) return tb - ta;
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        }
        case "frequency":
        default:
          if (ma.openCount !== mb.openCount) return mb.openCount - ma.openCount;
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
      }
    });
  }

  async function openInEditor(project: Project) {
    if (!preferences.mainEditor) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Set your Main Editor in extension preferences",
      });
      return;
    }
    await open(project.path, preferences.mainEditor.bundleId);
    await incrementOpenCount(project.path);
    setMeta(await getAllProjectMeta());
  }

  async function openInTerminal(project: Project) {
    if (!preferences.mainTerminal) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Set your Main Terminal in extension preferences",
      });
      return;
    }
    await open(project.path, preferences.mainTerminal.bundleId);
    await incrementOpenCount(project.path);
    setMeta(await getAllProjectMeta());
  }

  async function openInBoth(project: Project) {
    if (!preferences.mainEditor || !preferences.mainTerminal) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Set both Main Editor and Main Terminal in preferences",
      });
      return;
    }
    await open(project.path, preferences.mainEditor.bundleId);
    await open(project.path, preferences.mainTerminal.bundleId);
    await incrementOpenCount(project.path);
    setMeta(await getAllProjectMeta());
  }

  async function handleTogglePin(project: Project) {
    const pinned = await togglePin(project.path);
    setMeta(await getAllProjectMeta());
    await showToast({
      style: Toast.Style.Success,
      title: pinned ? "Project pinned" : "Project unpinned",
      message: project.name,
    });
  }

  async function handleResetRanking(project: Project) {
    await resetRanking(project.path);
    setMeta(await getAllProjectMeta());
    await showToast({
      style: Toast.Style.Success,
      title: `${SORT_MODES.frequency.label} reset`,
      message: project.name,
    });
  }

  async function handleMove(project: Project, direction: "up" | "down") {
    const sorted = sortedProjects();
    await moveProject(
      project.path,
      direction,
      sorted.map((p) => p.path),
    );
    setMeta(await getAllProjectMeta());
  }

  async function deleteProject(project: Project) {
    const confirmed = await confirmAlert({
      title: "Delete Project",
      message: `Are you sure you want to delete "${project.name}"? This will move the folder to Trash.`,
      primaryAction: {
        title: "Move to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await trash(project.path);
      await showToast({
        style: Toast.Style.Success,
        title: "Project moved to Trash",
        message: project.name,
      });
      await loadProjects();
    }
  }

  function parentPath(projectPath: string): string {
    const parts = projectPath.replace(/^\/Users\/[^/]+/, "~").split("/");
    parts.pop();
    return parts.join("/");
  }

  function renderProject(project: Project) {
    const pm = meta[project.path] ?? { openCount: 0, pinned: false };
    return (
      <List.Item
        key={project.path}
        title={project.name}
        subtitle={parentPath(project.path)}
        icon={{ fileIcon: project.path }}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Open">
              <Action
                title="Open in Editor"
                icon={Icon.Code}
                onAction={() => openInEditor(project)}
              />
              <Action
                title="Open in Terminal"
                icon={Icon.Terminal}
                onAction={() => openInTerminal(project)}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Open in Editor + Terminal"
                icon={Icon.AppWindowGrid2x2}
                onAction={() => openInBoth(project)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              />
              <Action.OpenWith
                path={project.path}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Manage">
              <Action
                title={pm.pinned ? "Unpin Project" : "Pin Project"}
                icon={pm.pinned ? Icon.PinDisabled : Icon.Pin}
                onAction={() => handleTogglePin(project)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              {sortMode === "manual" && (
                <>
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() => handleMove(project, "up")}
                    shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    onAction={() => handleMove(project, "down")}
                    shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                  />
                </>
              )}
              <Action
                title={`Reset ${SORT_MODES.frequency.label}`}
                icon={Icon.ArrowCounterClockwise}
                onAction={() => handleResetRanking(project)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
              <Action.Push
                title="Create New Project"
                icon={Icon.NewFolder}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateProject />}
              />
              <Action
                title="Delete Project"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteProject(project)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Utils">
              <Action.ShowInFinder
                path={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
              <Action.CopyToClipboard
                title="Copy Path"
                content={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Push
                title="Manage Paths"
                icon={Icon.Gear}
                target={<ManagePaths />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function renderSection(pinned: boolean) {
    const items = sortedProjects().filter(
      (p) => (meta[p.path]?.pinned ?? false) === pinned,
    );

    if (pinned && items.length === 0) return null;

    const title = pinned
      ? "Pinned"
      : `Sort mode: ${SORT_MODES[sortMode].label}`;

    return (
      <List.Section title={title}>
        {items.map((project) => renderProject(project))}
      </List.Section>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search projects..."
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          value={sortMode}
          onChange={handleSortChange}
        >
          {Object.entries(SORT_MODES).map(([value, { label, icon }]) => (
            <List.Dropdown.Item
              key={value}
              title={label}
              value={value}
              icon={icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No projects found"
          description="Add a project path to get started"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Paths"
                icon={Icon.Gear}
                target={<ManagePaths />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {renderSection(true)}
          {renderSection(false)}
        </>
      )}
    </List>
  );
}
