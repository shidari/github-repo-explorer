import type { HTMLAttributes } from "react";
import styles from "./badge.module.css";

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, children, ...props }: BadgeProps) {
  return (
    <span
      className={`${styles.badge}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </span>
  );
}
