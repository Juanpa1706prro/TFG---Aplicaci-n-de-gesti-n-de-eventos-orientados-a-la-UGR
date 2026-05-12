import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isUgrEmail', async: false })
export class IsUgrEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string, _args: ValidationArguments): boolean {
    if (!email || typeof email !== 'string') return false;
    const lower = email.trim().toLowerCase();
    return lower.endsWith('@correo.ugr.es') || lower.endsWith('@ugr.es');
  }

  defaultMessage(): string {
    return 'El correo debe ser de la UGR (@correo.ugr.es o @ugr.es)';
  }
}
