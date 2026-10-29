export function rosterName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  const initial = last.charAt(0);
  if (initial === "") {
    return first;
  }
  return `${first} ${initial.toUpperCase()}.`;
}
