import type { Meta, StoryObj } from "storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "TypeScript" },
};

export const Languages: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Badge>JavaScript</Badge>
      <Badge>TypeScript</Badge>
      <Badge>Rust</Badge>
      <Badge>Go</Badge>
    </div>
  ),
};
