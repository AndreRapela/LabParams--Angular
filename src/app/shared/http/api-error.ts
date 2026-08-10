import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
  request_id?: unknown;
}

export function apiErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.',
): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;

  const body = error.error as ApiErrorBody | string | null;
  const contentType =
    error.headers.get('content-type')?.toLocaleLowerCase() ?? '';
  if (
    typeof body === 'string' &&
    body.trim() &&
    !contentType.includes('text/html') &&
    body.length <= 500
  ) {
    return body.trim();
  }
  if (body && typeof body === 'object') {
    let message = '';
    if (typeof body.message === 'string' && body.message.trim()) {
      message = body.message.trim();
    } else if (typeof body.error === 'string' && body.error.trim()) {
      message = body.error.trim();
    }
    if (message) {
      return typeof body.request_id === 'string' && body.request_id.trim()
        ? `${message} Referência: ${body.request_id.trim()}.`
        : message;
    }
  }

  if (error.status === 0) {
    return 'A API está indisponível. Verifique a conexão e tente novamente.';
  }
  if (error.status === 401)
    return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error.status === 403)
    return 'Seu perfil não possui permissão para esta operação.';
  if (error.status === 404) return 'O registro solicitado não foi encontrado.';
  if (error.status === 409)
    return 'A operação conflita com o estado atual do registro.';
  if (error.status === 429)
    return 'Muitas solicitações em sequência. Aguarde um momento e tente novamente.';
  return fallback;
}
