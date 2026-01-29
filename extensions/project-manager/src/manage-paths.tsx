import {
  List,
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Color } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import {
  getStoredPaths,
  addStoredPath,
  removeStoredPath,
} from "./helpers/storage";
import { PATH_LABELS } from "./utils/consts";

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

function directoryExists(p: string): boolean {
  const base = p.endsWith("/*") ? p.slice(0, -2) : p;
  const expanded = expandHome(base);
  try {
    return fs.statSync(expanded).isDirectory();
  } catch {
    return false;
  }
}

export default function ManagePaths() {
  const [paths, setPaths] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPaths();
  }, []);

  async function loadPaths() {
    setIsLoading(true);
    setPaths(await getStoredPaths());
    setIsLoading(false);
  }

  async function handleAdd(newPath: string) {
    const trimmed = newPath.trim();
    if (!trimmed) return;

    const updated = await addStoredPath(trimmed);
    setPaths(updated);
    setSearchText("");

    if (!directoryExists(trimmed)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Path added, but directory not found",
        message: trimmed,
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Path added",
        message: trimmed,
      });
    }
  }

  async function handleRemove(pathToRemove: string) {
    const updated = await removeStoredPath(pathToRemove);
    setPaths(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Path removed",
      message: pathToRemove,
    });
  }

  const filtered = paths.filter((p) =>
    p.toLowerCase().includes(searchText.toLowerCase()),
  );

  const showAddItem =
    searchText.trim().length > 0 && !paths.includes(searchText.trim());

  return (
    <List
      searchBarPlaceholder="Search or type a path to add (e.g. ~/Developer/*)"
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={isLoading}
    >
      {showAddItem && (
        <List.Section title="Add">
          <List.Item
            key="__add__"
            title={`Add "${searchText.trim()}"`}
            icon={Icon.NewFolder}
            actions={
              <ActionPanel>
                <Action
                  title="Add Path"
                  icon={Icon.NewFolder}
                  onAction={() => handleAdd(searchText)}
                />
                <Action.Push
                  title="Show Help"
                  icon={Icon.QuestionMark}
                  target={<PathHelp />}
                  shortcut={{ modifiers: ["cmd"], key: "/" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {filtered.length > 0 && (
        <List.Section title="Paths">
          {filtered.map((p) => {
            const isWildcard = p.endsWith("/*");
            const cleanPath = isWildcard ? p.slice(0, -2) : p;
            const folderName = cleanPath.split("/").pop() ?? cleanPath;
            const label = isWildcard ? PATH_LABELS.parent : PATH_LABELS.single;
            const exists = directoryExists(p);

            return (
              <List.Item
                key={p}
                title={folderName}
                subtitle={p.replace(/^\/Users\/[^/]+/, "~")}
                icon={{ fileIcon: expandHome(cleanPath) }}
                accessories={[
                  ...(!exists
                    ? [{ tag: { value: "Not found", color: Color.Red } }]
                    : []),
                  { text: label },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Path" content={p} />
                    <Action
                      title="Remove Path"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemove(p)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                    <Action.Push
                      title="Show Help"
                      icon={Icon.QuestionMark}
                      target={<PathHelp />}
                      shortcut={{ modifiers: ["cmd"], key: "/" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!showAddItem && filtered.length === 0 && !isLoading && (
        <List.EmptyView
          title="No paths configured"
          description="Type a path above to add it (e.g. ~/Developer/*)"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Help"
                icon={Icon.QuestionMark}
                target={<PathHelp />}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

const helpMarkdown = `
# Path Formats

## ${PATH_LABELS.parent} — \`~/Developer/*\`

Each **subfolder** inside the directory becomes a separate project.

\`\`\`
~/Developer/*
├── project-a  → project
├── project-b  → project
└── project-c  → project
\`\`\`

## ${PATH_LABELS.single} — \`~/Developer/my-app\`

The directory itself is treated as a **single project**.

\`\`\`
~/Developer/my-app  → project
\`\`\`

## Tips

- Use \`~\` for your home directory
- Use \`/*\` at the end to scan all subfolders (1 level deep)
- You can add as many paths as you want
- Hidden folders (starting with \`.\`) are excluded from scans
`;

function PathHelp() {
  return <Detail navigationTitle="Path Help" markdown={helpMarkdown} />;
}
