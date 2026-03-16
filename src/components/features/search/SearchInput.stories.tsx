import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
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

export const TypeQuery: Story = {
  args: { defaultValue: "", onInputChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox");

    await userEvent.type(input, "next.js", { delay: 80 });

    await expect(args.onInputChange).toHaveBeenCalled();
    await expect(input).toHaveValue("next.js");
  },
};

export const ClearAndRetype: Story = {
  args: { defaultValue: "react", onInputChange: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox");

    await userEvent.clear(input);
    await expect(input).toHaveValue("");

    await userEvent.type(input, "vue", { delay: 80 });
    await expect(input).toHaveValue("vue");
  },
};
