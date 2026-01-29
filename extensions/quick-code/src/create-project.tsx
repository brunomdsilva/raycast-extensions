import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { getBaseDirectories } from "./helpers/projects";
import { getStoredPaths } from "./helpers/storage";

export default function CreateProject() {
  const [baseDirectories, setBaseDirectories] = useState<string[]>([]);
  const { pop } = useNavigation();

  useEffect(() => {
    getStoredPaths().then((paths) => {
      setBaseDirectories(getBaseDirectories(paths));
    });
  }, []);

  async function handleSubmit(values: { name: string; directory: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project name is required",
      });
      return;
    }

    const projectPath = path.join(values.directory, name);

    if (fs.existsSync(projectPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder already exists",
        message: projectPath,
      });
      return;
    }

    try {
      fs.mkdirSync(projectPath, { recursive: true });
      await showToast({
        style: Toast.Style.Success,
        title: "Project created",
        message: name,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Create New Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Project Name"
        placeholder="my-new-project"
      />
      <Form.Dropdown id="directory" title="Directory">
        {baseDirectories.map((dir) => (
          <Form.Dropdown.Item
            key={dir}
            title={dir.replace(/^\/Users\/[^/]+/, "~")}
            value={dir}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
