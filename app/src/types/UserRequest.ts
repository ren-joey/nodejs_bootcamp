import { UserRole } from "../entity/User";

export interface UserRequestBody {
    name: string,
    email: string,
    password: string,
    role?: UserRole
}