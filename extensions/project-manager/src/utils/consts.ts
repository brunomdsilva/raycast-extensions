export const PATH_LABELS = {
  parent: "Parent Folder",
  single: "Single Folder",
} as const;

import { Icon } from "@raycast/api";

export const SORT_MODES = {
  frequency: { label: "Frequency", icon: Icon.BarChart },
  manual: { label: "Manual", icon: Icon.Shuffle },
  alphabetical: { label: "Alphabetical", icon: Icon.Text },
  recent: { label: "Recent", icon: Icon.Clock },
} as const;
