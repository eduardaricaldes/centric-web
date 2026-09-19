import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className = "", id, children, ...rest },
  ref,
) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`h-11 w-full rounded-field border bg-surface px-3 text-sm text-ink
          focus:outline-none focus:ring-2 focus:ring-north/40 disabled:opacity-50
          ${error ? "border-red" : "border-line"}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-sm text-red">{error}</span>}
    </div>
  );
});
