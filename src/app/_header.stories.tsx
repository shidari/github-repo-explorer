import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Header } from "./_header";

const meta = {
  title: "App/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
