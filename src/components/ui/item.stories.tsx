import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemMedia,
  ItemTitle,
} from "./item";

const meta = {
  title: "UI/Item",
  component: Item,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Item>
      <ItemMedia>
        <Avatar
          src="https://avatars.githubusercontent.com/u/69631?v=4"
          alt="facebook"
          fallback="FB"
          size="sm"
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>facebook/react</ItemTitle>
        <ItemDescription>
          A declarative, efficient, and flexible JavaScript library for building
          user interfaces.
        </ItemDescription>
        <ItemFooter>
          <Badge>TypeScript</Badge>
          <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
            &#9733; 230.5k
          </span>
        </ItemFooter>
      </ItemContent>
    </Item>
  ),
};

export const Outline: Story = {
  render: () => (
    <Item variant="outline">
      <ItemMedia>
        <Avatar
          src="https://avatars.githubusercontent.com/u/14985020?v=4"
          alt="vercel"
          fallback="VE"
          size="sm"
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>vercel/next.js</ItemTitle>
        <ItemDescription>The React Framework</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const Muted: Story = {
  render: () => (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>No media example</ItemTitle>
        <ItemDescription>Item without media slot</ItemDescription>
      </ItemContent>
    </Item>
  ),
};
