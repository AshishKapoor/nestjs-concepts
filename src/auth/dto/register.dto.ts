import { IsEmail, IsString, MinLength } from 'class-validator';

// Registration input. Crucially there is NO `role` field: letting a client pick
// its own role would be a privilege-escalation hole. New users always default to
// USER (see the entity); promotion to ADMIN is an admin-only / seed concern.
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
