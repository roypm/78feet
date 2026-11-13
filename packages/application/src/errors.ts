import { DomainError } from "@78feet/domain";
export class MissingResource extends DomainError {
  constructor(message = "El recurso no existe") {
    super("FORBIDDEN", message);
    this.name = "MissingResource";
  }
}
