import type { ComponentProps } from "react";
import styles from "./skeleton.module.css";

export type SkeletonProps = ComponentProps<"div">;

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={`${styles.skeleton}${className ? ` ${className}` : ""}`}
      style={style}
      {...props}
    />
  );
}
