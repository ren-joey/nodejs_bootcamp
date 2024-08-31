import { UserRole } from '../../entity/User';

interface ReqUser {
    userId: number;
    role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: ReqUser
    }
  }
}
