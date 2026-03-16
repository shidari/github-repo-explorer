import type { HTMLAttributes } from "react";
import styles from "./label.module.css";

type LabelProps = HTMLAttributes<HTMLElement> & {
  label: string;
};

/**
 * ラベル付きの値を表示するコンポーネント。
 * セマンティクスは dl（description list）を使用。
 * - dt（description term）: ラベル部分
 * - dd（description details）: 値部分
 *
 * TODO: 用途に応じてセマンティクスを精緻化する
 * （例: フォーム連携時は <label> + htmlFor、テーブル的な用途は別コンポーネント等）
 */
export function Label({ label, children, className, ...props }: LabelProps) {
  return (
    <dl
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      {...props}
    >
      <dt className={styles.term}>{label}:</dt>
      <dd className={styles.definition}>{children}</dd>
    </dl>
  );
}
