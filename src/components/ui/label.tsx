import type { ComponentProps } from "react";
import styles from "./label.module.css";

export type LabelProps = ComponentProps<"dl"> & {
  term: string;
};

/**
 * ラベル付きの値を表示するコンポーネント。
 * セマンティクスは dl（description list）を使用。
 * - dt（description term）: ラベル部分
 * - dd（description details）: 値部分
 */
export function Label({ term, children, className, ...props }: LabelProps) {
  return (
    <dl
      data-slot="label"
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      {...props}
    >
      <dt className={styles.term}>{term}:</dt>
      <dd className={styles.definition}>{children}</dd>
    </dl>
  );
}
