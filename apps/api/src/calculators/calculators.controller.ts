import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalculatorsService } from './calculators.service';

@ApiTags('Calculadoras')
@Controller('calculators')
export class CalculatorsController {
  constructor(private readonly calculators: CalculatorsService) {}

  @Post(':tool')
  @ApiOperation({
    summary: 'Calcula uma ferramenta com entradas explícitas do usuário',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  calculate(@Param('tool') tool: string, @Body() input: unknown) {
    return this.calculators.calculate(tool, input);
  }
}
