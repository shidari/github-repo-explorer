import type { Meta, StoryObj } from "storybook/react";
import { Card } from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Card content" },
};

export const WithContent: Story = {
  render: () => (
    <Card>
      <h3 style={{ margin: "0 0 0.5rem" }}>Title</h3>
      <p style={{ margin: 0, color: "#656d76" }}>Some description text here.</p>
    </Card>
  ),
};
