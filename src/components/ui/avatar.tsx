"use client";

import { type HTMLAttributes, useState } from "react";
import styles from "./avatar.module.css";

type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  src: string;
  alt: string;
  fallback: string;
  size?: "sm" | "default" | "lg";
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "default",
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <span
      className={`${styles.avatar}${className ? ` ${className}` : ""}`}
      data-size={size}
      {...props}
    >
      {hasError ? (
        <span className={styles.fallback}>{fallback}</span>
      ) : (
        // biome-ignore lint/performance/noImgElement: generic UI component
        <img
          className={styles.image}
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
        />
      )}
    </span>
  );
}
