import { z } from 'zod';
export function validationMessage(error: unknown): string {
  if (error instanceof SyntaxError)
    return 'Não foi possível abrir este arquivo. Escolha um backup do Black Market.';
  if (error instanceof z.ZodError)
    return error.issues
      .slice(0, 3)
      .map((i) => {
        const labels: Record<string, string> = {
          price: 'Preço',
          quantity: 'Quantidade',
          cost: 'Custo',
          name: 'Nome',
          taxPercent: 'Imposto',
          collectionBonus: 'Bônus de coleta',
          minutes: 'Tempo',
          chance: 'Chance',
          cap: 'Teto de chance',
          pity: 'Pity',
          currentPity: 'Essência atual',
          limit: 'Tentativas',
          probability: 'Probabilidade',
          yield: 'Rendimento',
          crafts: 'Número de crafts',
          owned: 'Estoque',
          location: 'Local',
          target: 'Meta',
          region: 'Região',
        };
        const field = String(i.path[i.path.length - 1] ?? '');
        const row = i.path.find((p) => typeof p === 'number');
        let message = 'Confira o valor informado neste campo.';
        if (i.code === 'custom' && !/api|docker|postgres|json|schema|dataset/i.test(i.message))
          message = i.message;
        if (i.code === 'invalid_type') message = 'Preencha o campo com um valor válido.';
        if (i.code === 'too_small')
          message = 'Valor abaixo do mínimo permitido: ' + String(i.minimum) + '.';
        if (i.code === 'too_big')
          message = 'Valor acima do máximo permitido: ' + String(i.maximum) + '.';
        if (i.code === 'invalid_value') message = 'Selecione uma opção válida.';
        return (
          (labels[field]
            ? labels[field] + (row !== undefined ? ' · linha ' + (Number(row) + 1) : '') + ': '
            : '') + message
        );
      })
      .join(' · ');
  return error instanceof RangeError &&
    !/must|basisPoints|api|docker|postgres|schema/i.test(error.message)
    ? error.message
    : 'Não foi possível concluir. Confira os dados informados e tente novamente.';
}
export function evaluate<T>(calculate: () => T): { value: T | null; error: string | null } {
  try {
    return { value: calculate(), error: null };
  } catch (error) {
    return { value: null, error: validationMessage(error) };
  }
}
