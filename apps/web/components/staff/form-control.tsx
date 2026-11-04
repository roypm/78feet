"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { Field } from "@/components/staff/field";
import { useConstraintValidity } from "@/components/staff/use-constraint-validity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
        ref={field.ref}
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

type FormTextareaProps = { label: string; header?: ReactNode } & ComponentProps<typeof Textarea>;

export function FormTextarea({
  label,
  header,
  id,
  disabled,
  className,
  onInvalid,
  onChange,
  onBlur,
  ...props
}: FormTextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const field = useConstraintValidity<HTMLTextAreaElement>();
  const errorId = `${fieldId}-error`;

  return (
    <Field label={label} htmlFor={fieldId} invalid={field.invalid} disabled={disabled} error={field.error} errorId={errorId}>
      {header}
      <Textarea
        {...props}
        ref={field.ref}
        id={fieldId}
        disabled={disabled}
        className={className}
        aria-invalid={field.invalid || undefined}
        aria-describedby={field.invalid ? errorId : undefined}
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
