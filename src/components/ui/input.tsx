import type { InputHTMLAttributes } from "react";
import styles from "./input.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={`${styles.input}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
