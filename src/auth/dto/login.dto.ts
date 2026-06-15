import { IsEmail, IsString } from 'class-validator';

// Login input. We don't enforce MinLength here — the password either matches the
// stored hash or it doesn't; re-validating its shape adds nothing.
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
