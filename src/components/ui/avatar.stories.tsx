import type { Meta, StoryObj } from "storybook/react";
import { Avatar } from "./avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://avatars.githubusercontent.com/u/69631?v=4",
    alt: "facebook",
    fallback: "FB",
  },
};

export const Small: Story = {
  args: {
    src: "https://avatars.githubusercontent.com/u/69631?v=4",
    alt: "facebook",
    fallback: "FB",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    src: "https://avatars.githubusercontent.com/u/69631?v=4",
    alt: "facebook",
    fallback: "FB",
    size: "lg",
  },
};

export const Fallback: Story = {
  args: {
    src: "https://invalid-url.example.com/broken.png",
    alt: "broken",
    fallback: "CN",
  },
};
