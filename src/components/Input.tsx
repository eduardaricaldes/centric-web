import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
}

function FieldChrome({
  label,
  error,
  hint,
  htmlFor,
  className = "",
  children,
}: FieldWrapperProps & { htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-sm text-red">{error}</span>
      ) : hint ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

const fieldBaseClasses =
  "h-11 w-full rounded-field border bg-surface px-3 text-sm text-ink placeholder:text-muted " +
  "focus:outline-none focus:ring-2 focus:ring-north/40 disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  // Sem id próprio, gera um: clicar no rótulo foca o campo e o leitor de tela lê o nome.
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldChrome label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <input
        ref={ref}
        id={fieldId}
        className={`${fieldBaseClasses} ${error ? "border-red" : "border-line"}`}
        {...rest}
      />
    </FieldChrome>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrapperProps {
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, mono = false, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldChrome label={label} error={error} hint={hint} htmlFor={fieldId} className={className}>
      <textarea
        ref={ref}
        id={fieldId}
        className={`w-full rounded-field border bg-surface px-3 py-2.5 text-sm text-ink
          placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-north/40
          disabled:opacity-50 ${mono ? "font-mono" : ""} ${error ? "border-red" : "border-line"}`}
        {...rest}
      />
    </FieldChrome>
  );
});
