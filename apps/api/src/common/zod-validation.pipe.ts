import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema, z } from 'zod';

/**
 * Validates request bodies / queries against the Zod schemas shared with the web app,
 * so the browser and the API enforce exactly the same rules.
 */
export class ZodValidationPipe<T extends ZodSchema> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    try {
      return this.schema.parse(value) as z.infer<T>;
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.') || '_';
          errors[path] = [...(errors[path] ?? []), issue.message];
        }
        throw new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors,
        });
      }
      throw error;
    }
  }
}

export const zodBody = <T extends ZodSchema>(schema: T) => new ZodValidationPipe(schema);
