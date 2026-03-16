import type { Meta, StoryObj } from "storybook/react";
import { expect, within } from "storybook/test";
import type { Repository } from "@/domain";
import { RepoDetail } from "./RepoDetail";

const baseRepo: Repository = {
  full_name: "facebook/react",
  html_url: "https://github.com/facebook/react",
  owner: {
    username: "facebook",
    avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4",
  },
  description: "The library for web and native user interfaces.",
  language: "JavaScript",
  stargazers_count: 225000,
  watchers_count: 8500,
  forks_count: 46000,
  open_issues_count: 870,
  topics: ["react", "javascript", "frontend", "ui", "declarative"],
  license: { key: "mit", name: "MIT License" },
  homepage: "https://react.dev",
  default_branch: "main",
  archived: false,
  created_at: new Date("2013-05-24"),
  updated_at: new Date("2026-03-15"),
};

const meta = {
  title: "Features/Detail/RepoDetail",
  component: RepoDetail,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof RepoDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { repo: baseRepo },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // タイトルが表示されている
    await expect(canvas.getByText("facebook/react")).toBeVisible();

    // Stats が表示されている
    await expect(canvas.getByText("225,000")).toBeVisible();
    await expect(canvas.getByText("Stars")).toBeVisible();

    // ラベル付き情報が表示されている
    await expect(canvas.getByText("Language:")).toBeVisible();
    await expect(canvas.getByText("JavaScript")).toBeVisible();
    await expect(canvas.getByText("License:")).toBeVisible();
    await expect(canvas.getByText("MIT License")).toBeVisible();
    await expect(canvas.getByText("Branch:")).toBeVisible();
    await expect(canvas.getByText("main")).toBeVisible();

    // Topics が表示されている
    await expect(canvas.getByText("Topics:")).toBeVisible();
    await expect(canvas.getByText("react")).toBeVisible();

    // Links が存在する
    await expect(canvas.getByText("Links:")).toBeVisible();
    const githubLink = canvas.getByRole("link", { name: "GitHub" });
    await expect(githubLink).toHaveAttribute(
      "href",
      "https://github.com/facebook/react",
    );
    const homepageLink = canvas.getByRole("link", { name: "Homepage" });
    await expect(homepageLink).toHaveAttribute("href", "https://react.dev");

    // 日付が yyyy/MM/dd で表示されている
    await expect(canvas.getByText("2013/05/24")).toBeVisible();
    await expect(canvas.getByText("2026/03/15")).toBeVisible();
  },
};

export const NoDescription: Story = {
  args: {
    repo: {
      ...baseRepo,
      full_name: "vercel/next.js",
      owner: {
        username: "vercel",
        avatar_url: "https://avatars.githubusercontent.com/u/14985020?v=4",
      },
      description: undefined,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("vercel/next.js")).toBeVisible();
    // description がないことを確認
    const description = canvas.queryByText(
      "The library for web and native user interfaces.",
    );
    await expect(description).toBeNull();
  },
};

export const Archived: Story = {
  args: {
    repo: {
      ...baseRepo,
      full_name: "facebook/create-react-app",
      archived: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Archived")).toBeVisible();
  },
};

export const NoLicense: Story = {
  args: {
    repo: { ...baseRepo, license: undefined },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const license = canvas.queryByText("License:");
    await expect(license).toBeNull();
  },
};

export const NoTopics: Story = {
  args: {
    repo: { ...baseRepo, topics: [] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const topics = canvas.queryByText("Topics:");
    await expect(topics).toBeNull();
  },
};

export const NoHomepage: Story = {
  args: {
    repo: { ...baseRepo, homepage: undefined },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const homepageLink = canvas.queryByRole("link", { name: "Homepage" });
    await expect(homepageLink).toBeNull();
  },
};
