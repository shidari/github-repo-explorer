import type { Meta, StoryObj } from "storybook/react";
import { RepoOverview } from "./RepoOverview";

const meta = {
  title: "Features/Search/RepoOverview",
  component: RepoOverview,
} satisfies Meta<typeof RepoOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    repo: {
      full_name: "facebook/react",
      owner: {
        username: "facebook",
        avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4",
      },
      description: "The library for web and native user interfaces.",
      language: "JavaScript",
      stargazers_count: 225000,
    },
  },
};

export const NoDescription: Story = {
  args: {
    repo: {
      full_name: "vercel/next.js",
      owner: {
        username: "vercel",
        avatar_url: "https://avatars.githubusercontent.com/u/14985020?v=4",
      },
      description: null,
      language: "TypeScript",
      stargazers_count: 128000,
    },
  },
};

export const NoLanguage: Story = {
  args: {
    repo: {
      full_name: "gothinkster/realworld",
      owner: {
        username: "gothinkster",
        avatar_url: "https://avatars.githubusercontent.com/u/23264268?v=4",
      },
      description: "The mother of all demo apps.",
      language: null,
      stargazers_count: 80000,
    },
  },
};
