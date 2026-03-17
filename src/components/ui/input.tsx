import type { ComponentProps } from "react";
import styles from "./input.module.css";

export type InputProps = ComponentProps<"input"> & {
  invalid?: boolean;
};

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      className={`${styles.input}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
