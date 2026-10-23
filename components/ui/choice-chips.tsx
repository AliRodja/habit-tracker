export interface Choice {
  value: string;
  label: string;
}

/** Pilihan tunggal berbentuk chip (radio tersembunyi), untuk form yang dikirim lewat Server Action. */
export function ChoiceChips({ name, options, defaultValue }: { name: string; options: Choice[]; defaultValue: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value} className="cursor-pointer">
          <input type="radio" name={name} value={option.value} defaultChecked={defaultValue === option.value} className="peer sr-only" />
          <span className="block rounded-lg border border-border bg-surface px-3.5 py-2 text-sm transition-colors hover:bg-surface-2 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-checked:text-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
