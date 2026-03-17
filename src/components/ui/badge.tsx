import type { ComponentProps } from "react";
import styles from "./badge.module.css";

export type BadgeProps = ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "outline";
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={`${styles.badge}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </span>
  );
}
