import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<T>;

export default function Card<T extends ElementType = "div">({
  as,
  children,
  className,
  ...rest
}: CardProps<T>) {
  const Component = (as || "div") as ElementType;
  const merged = className ? `${styles.card} ${className}` : styles.card;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Component className={merged} {...(rest as any)}>{children}</Component>;
}
