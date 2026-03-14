import type { HTMLAttributes } from "react";
import styles from "./card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={`${styles.card}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
