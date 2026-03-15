import styles from "./item.module.css";

type ItemProps = {
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm" | "xs";
} & React.HTMLAttributes<HTMLDivElement>;

export function Item({
  variant = "default",
  size = "default",
  className,
  ...props
}: ItemProps) {
  return (
    <div
      className={`${styles.item} ${className ?? ""}`}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}

export function ItemMedia({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.media} ${className ?? ""}`} {...props} />;
}

export function ItemContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.content} ${className ?? ""}`} {...props} />;
}

export function ItemTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`${styles.title} ${className ?? ""}`} {...props} />;
}

export function ItemDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`${styles.description} ${className ?? ""}`} {...props} />
  );
}

export function ItemActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.actions} ${className ?? ""}`} {...props} />;
}

export function ItemHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.header} ${className ?? ""}`} {...props} />;
}

export function ItemFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.footer} ${className ?? ""}`} {...props} />;
}

export function ItemGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.group} ${className ?? ""}`} {...props} />;
}

export function ItemSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.separator} ${className ?? ""}`} {...props} />
  );
}
