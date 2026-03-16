import type { Meta, StoryObj } from "storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Pagination } from "./pagination";

const meta = {
  title: "UI/Pagination",
  component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 10, onPageChange: fn() },
};

export const MiddlePage: Story = {
  args: { currentPage: 5, totalPages: 10, onPageChange: fn() },
};

export const LastPage: Story = {
  args: { currentPage: 10, totalPages: 10, onPageChange: fn() },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3, onPageChange: fn() },
};

export const ClickNext: Story = {
  args: { currentPage: 3, totalPages: 10, onPageChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole("button", { name: "Next" });

    await userEvent.click(next);
    await expect(args.onPageChange).toHaveBeenCalledWith(4);
  },
};

export const ClickPrev: Story = {
  args: { currentPage: 5, totalPages: 10, onPageChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const prev = canvas.getByRole("button", { name: "Prev" });

    await userEvent.click(prev);
    await expect(args.onPageChange).toHaveBeenCalledWith(4);
  },
};

export const ClickPageNumber: Story = {
  args: { currentPage: 1, totalPages: 5, onPageChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page3 = canvas.getByRole("button", { name: "3" });

    await userEvent.click(page3);
    await expect(args.onPageChange).toHaveBeenCalledWith(3);
  },
};

export const PrevDisabledOnFirstPage: Story = {
  args: { currentPage: 1, totalPages: 10, onPageChange: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prev = canvas.getByRole("button", { name: "Prev" });

    await expect(prev).toBeDisabled();
  },
};

export const NextDisabledOnLastPage: Story = {
  args: { currentPage: 10, totalPages: 10, onPageChange: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole("button", { name: "Next" });

    await expect(next).toBeDisabled();
  },
};
