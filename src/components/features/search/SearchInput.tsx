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
      placeholder="Search repositories..."
      defaultValue={defaultValue}
      onChange={(e) => onInputChange(e.target.value)}
      aria-label="Search repositories"
    />
  );
}
