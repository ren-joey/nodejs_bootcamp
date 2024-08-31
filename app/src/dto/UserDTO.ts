import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "../entity/User";

export class RegisterUserDTO {
@IsString()
@MinLength(2)
    name!: string;

@IsEmail()
    email!: string;

@IsString()
@MinLength(6)
    password!: string;

@IsOptional()
@IsEnum(UserRole)
    role?: UserRole;
}

export class LoginUserDTO {
@IsEmail()
    email!: string;

@IsString()
    password!: string;
}