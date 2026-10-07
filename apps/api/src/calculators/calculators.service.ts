import { type CalculatorKey, calculators, MODEL_VERSION } from '@bdo/calculators';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ZodError } from 'zod';

@Injectable()
export class CalculatorsService {
  calculate(tool: string, input: unknown) {
    if (!Object.prototype.hasOwnProperty.call(calculators, tool)) {
      throw new NotFoundException('Calculadora não encontrada.');
    }
    try {
      return {
        tool,
        modelVersion: MODEL_VERSION,
        source: 'user-input',
        result: calculators[tool as CalculatorKey](input),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Confira os dados informados.',
          issues: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      if (error instanceof RangeError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
