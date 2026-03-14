import type { HTMLAttributes } from "react";
import styles from "./skeleton.module.css";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton}${className ? ` ${className}` : ""}`}
      style={style}
      {...props}
    />
  );
}
