import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SearchInput } from "./SearchInput";

const meta = {
  title: "Search/SearchInput",
  component: SearchInput,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: "", onInputChange: fn() },
};

export const WithValue: Story = {
  args: { defaultValue: "react", onInputChange: fn() },
};
