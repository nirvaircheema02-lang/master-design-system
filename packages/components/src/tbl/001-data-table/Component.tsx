"use client";
import { useId, useMemo, useState } from "react";
import "./tbl-001.css";
import "./skins.css";

export interface Tbl001Column { id: string; label: string; numeric?: boolean; sortable?: boolean }
export type Tbl001Row = Record<string, string | number>;
export interface Tbl001Props {
  /** Names the table (a <caption>) and its scroll region. Required. */
  caption: string;
  columns: Tbl001Column[];
  rows: Tbl001Row[];
  /** The first column's cells are row headers (th scope="row"): they identify the row for a screen reader. */
  rowHeader?: boolean;
  defaultSort?: { id: string; direction: "ascending" | "descending" };
  skin?: string;
  /** Visual design (manifest props.design). Omitted = plain. */
  design?: "plain" | "lines" | "zebra" | "grid" | "rows";
  className?: string;
}

/**
 * TBL-001 Data table: real <table> semantics (caption, th scope, row headers), sortable columns as buttons inside the header with
 * `aria-sort` on exactly the sorted column, an announcement of each sort, and a keyboard-focusable scroll region so narrow viewports scroll
 * the table instead of the page.
 */
export function Tbl001({ caption, columns, rows, rowHeader = true, defaultSort, skin, design, className }: Tbl001Props) {
  const capId = useId();
  const [sort, setSort] = useState<{ id: string; direction: "ascending" | "descending" } | null>(defaultSort ?? null);
  const [said, setSaid] = useState("");
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    const dir = sort.direction === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => dir * (col?.numeric ? Number(a[sort.id]) - Number(b[sort.id]) : String(a[sort.id]).localeCompare(String(b[sort.id]))));
  }, [rows, sort, columns]);
  const toggle = (c: Tbl001Column) => {
    const direction = sort?.id === c.id && sort.direction === "ascending" ? "descending" : "ascending";
    setSort({ id: c.id, direction });
    setSaid(`Sorted by ${c.label}, ${direction}`);
  };
  return (
    <div className={["ds-tbl-001", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <div className="ds-tbl-001__scroll" role="region" aria-labelledby={capId} tabIndex={0}>
        <table className="ds-tbl-001__table">
          <caption id={capId} className="ds-tbl-001__caption">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id} scope="col" className="ds-tbl-001__th" data-numeric={c.numeric ? "" : undefined} aria-sort={c.sortable && sort?.id === c.id ? sort.direction : undefined}>
                  {c.sortable ? (
                    <button type="button" className="ds-tbl-001__sort" onClick={() => toggle(c)}>
                      <span>{c.label}</span>
                      <svg className="ds-tbl-001__arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false" data-state={sort?.id === c.id ? sort.direction : "none"}><path d="M10 4v12M6 8l4-4 4 4" /></svg>
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="ds-tbl-001__tr">
                {columns.map((c, ci) => rowHeader && ci === 0
                  ? <th key={c.id} scope="row" className="ds-tbl-001__td ds-tbl-001__rowhead">{r[c.id]}</th>
                  : <td key={c.id} className="ds-tbl-001__td" data-numeric={c.numeric ? "" : undefined}>{r[c.id]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ds-tbl-001__vh" role="status" aria-live="polite">{said}</div>
    </div>
  );
}
