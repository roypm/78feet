import { useId, type ComponentProps, type ReactNode, type Ref } from "react";
import { Field } from "@/components/common/forms/field";
import { useConstraintValidity } from "@/components/common/forms/use-constraint-validity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

type FormInputProps = { label: string; error?: string } & ComponentProps<typeof Input>;

export function FormInput({
  label,
  id,
  disabled,
  className,
  onInvalid,
  onChange,
  onBlur,
  error: externalError,
  ref,
  ...props
}: FormInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const field = useConstraintValidity<HTMLInputElement>();
  const errorId = `${fieldId}-error`;
  const error = externalError || field.error;
  const invalid = Boolean(error);

  return (
    <Field label={label} htmlFor={fieldId} invalid={invalid} disabled={disabled} error={error} errorId={errorId}>
      <Input
        {...props}
        ref={(node) => {
          field.ref.current = node;
          assignRef(ref, node);
        }}
        id={fieldId}
        disabled={disabled}
        className={className}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onInvalid={(event) => {
          field.onInvalid(event);
          onInvalid?.(event);
        }}
        onChange={(event) => {
          field.onInput(event.currentTarget);
          onChange?.(event);
        }}
        onBlur={(event) => {
          field.onBlur(event.currentTarget);
          onBlur?.(event);
        }}
      />
    </Field>
  );
}

type FormTextareaProps = { label: string; header?: ReactNode; error?: string } & ComponentProps<typeof Textarea>;

export function FormTextarea({
  label,
  header,
  id,
  disabled,
  className,
  onInvalid,
  onChange,
  onBlur,
  error: externalError,
  ref,
  ...props
}: FormTextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const field = useConstraintValidity<HTMLTextAreaElement>();
  const errorId = `${fieldId}-error`;

  return (
    <Field label={label} htmlFor={fieldId} invalid={Boolean(externalError || field.error)} disabled={disabled} error={externalError || field.error} errorId={errorId}>
      {header}
      <Textarea
        {...props}
        ref={(node) => {
          field.ref.current = node;
          assignRef(ref, node);
        }}
        id={fieldId}
        disabled={disabled}
        className={className}
        aria-invalid={Boolean(externalError || field.error) || undefined}
        aria-describedby={externalError || field.error ? errorId : undefined}
        onInvalid={(event) => {
          field.onInvalid(event);
          onInvalid?.(event);
        }}
        onChange={(event) => {
          field.onInput(event.currentTarget);
          onChange?.(event);
        }}
        onBlur={(event) => {
          field.onBlur(event.currentTarget);
          onBlur?.(event);
        }}
      />
    </Field>
  );
}
