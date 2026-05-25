import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// -------------------------------------------------------------------
// UGR email validator
// class-validator constraint for @correo.ugr.es and @ugr.es domains.
// -------------------------------------------------------------------

/**
 * Ensures the email belongs to an allowed UGR domain.
 */
@ValidatorConstraint({ name: 'isUgrEmail', async: false })
export class IsUgrEmailConstraint implements ValidatorConstraintInterface {
  /**
   * @param {string} email - Value being validated.
   * @param {ValidationArguments} _args - class-validator context (unused).
   * @returns {boolean} True if the email ends with an allowed UGR suffix.
   */
  validate(email: string, _args: ValidationArguments): boolean {
    if (!email || typeof email !== 'string') return false;
    const lower = email.trim().toLowerCase();
    return lower.endsWith('@correo.ugr.es') || lower.endsWith('@ugr.es');
  }

  /**
   * @returns {string} Validation error message shown to the client.
   */
  defaultMessage(): string {
    return 'El correo debe ser de la UGR (@correo.ugr.es o @ugr.es)';
  }
}
