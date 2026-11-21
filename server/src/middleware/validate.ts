import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type ValidationSchema = AnyZodObject | ZodEffects<AnyZodObject>;

export function validate(schema: ValidationSchema): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      next(error);
    }
  };
}
