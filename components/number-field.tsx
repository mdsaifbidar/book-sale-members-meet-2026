"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * A numeric input that lets the user actually clear the field while
 * editing. A plain controlled <Input type="number" value={n}> re-renders
 * "0" the instant the field is emptied (since Number("") is 0), which
 * makes it impossible to backspace a value out and type a new one — the
 * "0" keeps reappearing under the cursor. This keeps its own text buffer
 * so an empty field can stay empty mid-edit, and only re-syncs from the
 * external value when that value changes for a reason other than this
 * field's own onChange (e.g. a different book was selected).
 */
export function NumberField({
  value,
  onCommit,
  min,
  max,
  step,
  className,
  id,
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  className?: string;
  id?: string;
}) {
  const [text, setText] = useState(String(value));

  // Re-sync the text buffer when `value` changes for a reason other than
  // this field's own onChange (e.g. a different book was selected).
  // Adjusted during render (not an effect) per React's guidance for
  // resetting state when a prop changes: https://react.dev/learn/you-might-not-need-an-effect
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(String(value));
  }

  function commit(raw: string) {
    const parsed = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
    onCommit(clamped);
  }

  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        // Commit as the user types so totals update live, but skip an
        // empty field — committing "" -> 0 would force the display back
        // to "0" and undo the backspace that just cleared it.
        if (e.target.value !== "") commit(e.target.value);
      }}
      onBlur={() => commit(text)}
      className={className}
    />
  );
}
