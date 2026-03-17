"use client";

import { Input } from "@/components/ui/input";

export function SearchInput({
  defaultValue,
  onInputChange,
}: {
  defaultValue: string;
  onInputChange: (value: string) => void;
}) {
  return (
    <Input
      type="search"
      name="q"
      autoComplete="off"
      placeholder="リポジトリを検索…"
      defaultValue={defaultValue}
      onChange={(e) => onInputChange(e.target.value)}
      aria-label="リポジトリを検索"
    />
  );
}
