import type { ComponentProps } from "react";
import styles from "./item.module.css";

function cn(base: string, className?: string) {
  return `${base}${className ? ` ${className}` : ""}`;
}

export type ItemProps = ComponentProps<"div"> & {
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm" | "xs";
};

export function Item({
  variant = "default",
  size = "default",
  className,
  ...props
}: ItemProps) {
  return (
    <div
      data-slot="item"
      className={cn(styles.item, className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}

export type ItemMediaProps = ComponentProps<"div">;

export function ItemMedia({ className, ...props }: ItemMediaProps) {
  return (
    <div
      data-slot="item-media"
      className={cn(styles.media, className)}
      {...props}
    />
  );
}

export type ItemContentProps = ComponentProps<"div">;

export function ItemContent({ className, ...props }: ItemContentProps) {
  return (
    <div
      data-slot="item-content"
      className={cn(styles.content, className)}
      {...props}
    />
  );
}

export type ItemTitleProps = ComponentProps<"span">;

export function ItemTitle({ className, ...props }: ItemTitleProps) {
  return (
    <span
      data-slot="item-title"
      className={cn(styles.title, className)}
      {...props}
    />
  );
}

export type ItemDescriptionProps = ComponentProps<"p">;

export function ItemDescription({ className, ...props }: ItemDescriptionProps) {
  return (
    <p
      data-slot="item-description"
      className={cn(styles.description, className)}
      {...props}
    />
  );
}

export type ItemActionsProps = ComponentProps<"div">;

export function ItemActions({ className, ...props }: ItemActionsProps) {
  return (
    <div
      data-slot="item-actions"
      className={cn(styles.actions, className)}
      {...props}
    />
  );
}

export type ItemHeaderProps = ComponentProps<"div">;

export function ItemHeader({ className, ...props }: ItemHeaderProps) {
  return (
    <div
      data-slot="item-header"
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

export type ItemFooterProps = ComponentProps<"div">;

export function ItemFooter({ className, ...props }: ItemFooterProps) {
  return (
    <div
      data-slot="item-footer"
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}

export type ItemGroupProps = ComponentProps<"div">;

export function ItemGroup({ className, ...props }: ItemGroupProps) {
  return (
    <div
      data-slot="item-group"
      className={cn(styles.group, className)}
      {...props}
    />
  );
}

export type ItemSeparatorProps = ComponentProps<"hr">;

export function ItemSeparator({ className, ...props }: ItemSeparatorProps) {
  return (
    <hr
      data-slot="item-separator"
      className={cn(styles.separator, className)}
      {...props}
    />
  );
}
