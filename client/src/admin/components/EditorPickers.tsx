import { Icon, ICON_NAMES } from "../../lib/icons";
import { COLOR_OPTIONS, colorClasses, cn } from "../../lib/utils";
import { Select } from "../../components/ui";

export function EditorIconPicker({ value, onChange, label = "Icon", color = "blue" }: { value: string; onChange: (v: string) => void; label?: string; color?: string }) {
  const c = colorClasses(color);
  return (
    <div className="space-y-2">
      <span className="label block">{label}</span>
      <div className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border", c.soft, c.border)} aria-hidden>
          <Icon name={value} size={22} />
        </div>
        <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {ICON_NAMES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function EditorColorPicker({ value, onChange, label = "Color" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const c = colorClasses(value);
  return (
    <div className="space-y-2">
      <span className="label block">{label}</span>
      <div className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-2xl shrink-0 bg-gradient-to-br shadow-inner", c.gradient)} aria-hidden />
        <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {COLOR_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-1.5 px-1 pt-1">
        {COLOR_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            title={n}
            aria-label={n}
            onClick={() => onChange(n)}
            className={cn("w-5 h-5 rounded-full transition-transform hover:scale-110", colorClasses(n).solid, value === n && "ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-900")}
          />
        ))}
      </div>
    </div>
  );
}
