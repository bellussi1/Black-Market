import { planProduction, type ProductionPlannerInput } from '@bdo/calculators';

self.addEventListener('message', (event: MessageEvent<ProductionPlannerInput>) => {
  try {
    self.postMessage({ result: planProduction(event.data) });
  } catch {
    self.postMessage({ error: 'Não foi possível concluir a otimização.' });
  }
});
