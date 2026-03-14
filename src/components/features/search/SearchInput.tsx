"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import styles from "./SearchInput.module.css";

type SearchInputProps = {
  defaultValue?: string;
};

export function SearchInput({ defaultValue = "" }: SearchInputProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      startTransition(() => {
        if (value.trim()) {
          router.push(`/search?q=${encodeURIComponent(value.trim())}&page=1`);
        } else {
          router.push("/search");
        }
      });
    }, 300);
  }

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <Input
        type="search"
        placeholder="Search repositories..."
        defaultValue={defaultValue}
        onChange={handleChange}
        aria-label="Search repositories"
      />
    </form>
  );
}
