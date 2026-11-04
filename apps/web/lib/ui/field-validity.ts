export const REQUIRED_FIELD_MESSAGE = "Este campo es obligatorio.";

export type ConstraintControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function constraintMessageFromValidity(
  validity: Pick<ValidityState, "valid" | "valueMissing" | "typeMismatch" | "tooShort" | "tooLong" | "patternMismatch" | "badInput">,
  options: { type?: string; minLength?: number; maxLength?: number } = {},
): string {
  if (validity.valid) return "";
  if (validity.valueMissing) return REQUIRED_FIELD_MESSAGE;
  if (validity.typeMismatch && options.type === "email") return "Escribí un correo válido.";
  if (validity.tooShort) {
    const minimum = options.minLength && options.minLength > 0 ? options.minLength : 1;
    return `Mínimo ${minimum} caracteres.`;
  }
  if (validity.tooLong && options.maxLength && options.maxLength > 0) {
    return `Máximo ${options.maxLength} caracteres.`;
  }
  return "Este valor no es válido.";
}

export function constraintMessage(control: ConstraintControl): string {
  return constraintMessageFromValidity(control.validity, {
    type: "type" in control ? control.type : undefined,
    minLength: "minLength" in control ? control.minLength : undefined,
    maxLength: "maxLength" in control ? control.maxLength : undefined,
  });
}

export function isFirstInvalidControl(control: Element): boolean {
  const form = control.closest("form");
  if (!form) return true;
  return form.querySelector(":invalid") === control;
}

export function suppressNativeInvalid(event: { preventDefault: () => void; currentTarget: Element }): boolean {
  event.preventDefault();
  return isFirstInvalidControl(event.currentTarget);
}
