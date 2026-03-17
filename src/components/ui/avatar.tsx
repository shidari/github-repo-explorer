"use client";

import { type ComponentProps, useState } from "react";
import styles from "./avatar.module.css";

const SIZE_PX = { sm: 24, default: 40, lg: 56 } as const;

export type AvatarProps = ComponentProps<"span"> & {
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
  const px = SIZE_PX[size];

  return (
    <span
      data-slot="avatar"
      className={`${styles.avatar}${className ? ` ${className}` : ""}`}
      data-size={size}
      {...props}
    >
      {hasError ? (
        <span className={styles.fallback} role="img" aria-label={alt}>
          {fallback}
        </span>
      ) : (
        // biome-ignore lint/performance/noImgElement: generic UI component
        <img
          className={styles.image}
          src={src}
          alt={alt}
          width={px}
          height={px}
          loading="lazy"
          onError={() => setHasError(true)}
        />
      )}
    </span>
  );
}
