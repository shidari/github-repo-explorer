import type { Meta, StoryObj } from "storybook/react";
import { Pagination } from "./pagination";

const meta = {
  title: "UI/Pagination",
  component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 10, baseHref: "/search?q=react" },
};

export const MiddlePage: Story = {
  args: { currentPage: 5, totalPages: 10, baseHref: "/search?q=react" },
};

export const LastPage: Story = {
  args: { currentPage: 10, totalPages: 10, baseHref: "/search?q=react" },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3, baseHref: "/search?q=react" },
};
