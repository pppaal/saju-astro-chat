import type { ReactNode, CSSProperties } from "react";
import styles from "./Grid.module.css";

type GridProps = {
  children: ReactNode;
  columns?: number | string;
  gap?: string;
  className?: string;
};

export default function Grid({ children, columns, gap, className }: GridProps) {
  const style: CSSProperties = {};
  if (columns) {
    style.gridTemplateColumns = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  }
  if (gap) style.gap = gap;

  const merged = className ? `${styles.grid} ${className}` : styles.grid;
  return (
    <div className={merged} style={style}>
      {children}
    </div>
  );
}
