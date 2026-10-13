"use client";

import { ChevronDown } from "lucide-react";

/** Compact native select with a consistent chevron; keyboard and screen-reader behaviour stay native. */
export function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  groups,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
  /** Grouped options (rendered as optgroups). */
  groups?: { label: string; options: { value: string; label: string }[] }[];
}) {
  return (
    <div className="rx-field">
      <label className="rx-label" htmlFor={id}>{label}</label>
      <div className="rx-select-wrap">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {groups?.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
      </div>
    </div>
  );
}
