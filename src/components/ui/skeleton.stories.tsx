import type { Meta, StoryObj } from "storybook/react";
import { Skeleton } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { style: { width: "100%", height: "2.5rem" } },
};

export const CardSkeleton: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Skeleton style={{ width: "100%", height: "6rem" }} />
      <Skeleton style={{ width: "100%", height: "6rem" }} />
      <Skeleton style={{ width: "100%", height: "6rem" }} />
    </div>
  ),
};
