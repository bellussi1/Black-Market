import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  type LoggerService,
} from '@nestjs/common';
import type { Response } from 'express';

import type { CorrelatedRequest } from './request-controls';
export function safeProblem(exception: unknown, requestId?: string) {
  const parserError =
    exception && typeof exception === 'object' && 'type' in exception ? exception.type : null;
  const statusCode =
    exception instanceof HttpException
      ? exception.getStatus()
      : parserError === 'entity.too.large'
        ? 413
        : parserError === 'entity.parse.failed'
          ? 400
          : 500;
  const messages: Record<number, string> = {
    400: 'Confira os dados informados e tente novamente.',
    401: 'Entre na sua conta para continuar.',
    403: 'Esta solicitação não está disponível.',
    404: 'Não encontramos este registro.',
    409: 'Há alterações mais recentes. Carregue os dados e revise antes de salvar.',
    413: 'O arquivo é muito grande. Use um arquivo menor.',
    429: 'Aguarde um pouco antes de tentar novamente.',
    503: 'Não foi possível consultar agora. Tente novamente mais tarde.',
  };
  return {
    statusCode,
    code: statusCode >= 500 ? 'TEMPORARILY_UNAVAILABLE' : 'REQUEST_REJECTED',
    message: messages[statusCode] ?? 'Não foi possível concluir a solicitação.',
    requestId,
  };
}
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<CorrelatedRequest>();
    const response = context.getResponse<Response>();
    const problem = safeProblem(exception, request.requestId);
    if (problem.statusCode >= 500)
      this.logger.error({
        event: 'http_exception',
        requestId: request.requestId,
        status: problem.statusCode,
        cause: exception instanceof HttpException ? 'HttpException' : 'InternalError',
      });
    if (!response.headersSent) {
      response.setHeader('Cache-Control', 'no-store');
      response.status(problem.statusCode).json(problem);
    }
  }
}
