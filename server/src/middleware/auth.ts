import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { User } from '../modules/users/user.model';
import { UserRole } from '../types/express';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw AppError.unauthorized('Access token is missing');
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('email name role status');

    if (!user) {
      throw AppError.unauthorized('Account associated with token no longer exists');
    }

    if (user.status === 'suspended') {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'Your account has been suspended by an administrator'
      );
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('email name role status');

    if (user && user.status === 'active') {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      };
    }
    return next();
  } catch {
    return next();
  }
};

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        )
      );
    }

    return next();
  };
}
