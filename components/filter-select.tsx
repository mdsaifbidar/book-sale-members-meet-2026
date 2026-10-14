"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * A labeled <select> for a plain GET filter form (uncontrolled, submits via
 * its `name`). Exists only so the value->label lookup function can be
 * passed to SelectValue from a Server Component page — functions can't
 * cross the server/client boundary as props, so that mapping has to live
 * inside a client component.
 */
export function FilterSelect({
  id,
  name,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  const labelByValue = Object.fromEntries(options.map((o) => [o.value, o.label]));

  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id}>
        <SelectValue>{(value: string) => labelByValue[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
