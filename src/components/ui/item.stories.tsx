import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
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

export const Group: Story = {
  render: () => (
    <ItemGroup>
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
            A declarative, efficient, and flexible JavaScript library for
            building user interfaces.
          </ItemDescription>
          <ItemFooter>
            <Badge>TypeScript</Badge>
            <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
              &#9733; 230.5k
            </span>
          </ItemFooter>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
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
          <ItemFooter>
            <Badge>TypeScript</Badge>
            <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
              &#9733; 128.3k
            </span>
          </ItemFooter>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia>
          <Avatar
            src="https://avatars.githubusercontent.com/u/6154722?v=4"
            alt="microsoft"
            fallback="MS"
            size="sm"
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>microsoft/TypeScript</ItemTitle>
          <ItemDescription>
            TypeScript is a superset of JavaScript that compiles to clean
            JavaScript output.
          </ItemDescription>
          <ItemFooter>
            <Badge>TypeScript</Badge>
            <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
              &#9733; 101.2k
            </span>
          </ItemFooter>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const SmallGroup: Story = {
  render: () => (
    <ItemGroup>
      <Item size="sm">
        <ItemContent>
          <ItemTitle>Small item 1</ItemTitle>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item size="sm">
        <ItemContent>
          <ItemTitle>Small item 2</ItemTitle>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item size="sm">
        <ItemContent>
          <ItemTitle>Small item 3</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};
