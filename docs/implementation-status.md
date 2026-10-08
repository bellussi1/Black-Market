# Funcionalidades principais — estado de implementação

Em 08/10/2026, o código implementa os seguintes escopos MVP:

- Referências: receitas pesquisáveis, fichas compartilháveis e dados de NPCs, missões, conhecimento, habilidades, classes, locais, aprimoramento e Caphras.
- Personagem: prata, energia, 11 maestrias, equipamentos ligados ao catálogo, PA principal/despertar e PD.
- Recomendações: sessões observadas, produção e estoque, orçamento/energia/tempo; limitações e preços antigos explícitos.
- Planos: tarefas, materiais, reservas sem duplicar quantidades e estados que liberam reservas sem debitar estoque.
- Império de nodes/trabalhadores: cadastro de trabalhadores/tarefas, custos de cidade/alojamento, rotas com CP compartilhado e comparação diária; [uso e limites](worker-empire.md).
- Prints: números e candidatos de ícones, recorte arrastável ou numérico, revisão obrigatória antes de alteração.
- Contas: Supabase preparado, sincronização com versão/prévia e dono confirmado; ativação externa pendente.
- Mercado: consultas normalizadas persistidas, histórico por variante; coletor configurável OFF.
- Público: SSR e HTML de itens/receitas/referências/Home/legal, SEO básico, footer, privacidade, analytics preparado e deploy.

## Evidência e dependências

Catálogo ativo SA/pt: 74.216 itens, 212 categorias, 4.406 receitas distintas; 26 coleções de referência e 87.165 registros. Índice visual: 18.116 assinaturas. O banco preserva versões anteriores; não confundir contagem total de item_versions com catálogo ativo.

730 itens não têm nome localizado; localização inglesa e atlas/imagens de NPC não estão disponíveis. Fármaco da Harmonia (1399) aparece na busca e ficha, mas não tem receita importada. Dados ausentes não são inventados.

Contas exigem Supabase externo. Mercado ao vivo não foi validado devido ao bloqueio da fonte; coleta permanece OFF. Prints usam heurística, sem precisão medida em amostras reais. Recomendações não inventam curva de coleta por maestria. O império de trabalhadores calcula resultados informados e CP compartilhado; ainda não modela automaticamente workload, distância, habilidades, drops ou a melhor alocação global. Não há paridade integral com Workerman.

Consultar [auditoria final](production-audit.md) para separar PASSOU de NÃO VERIFICADO. Implementação MVP não significa reprodução integral dos concorrentes, validade jurídica ou operação pública ativada. Publicidade continua OFF até resolução da licença dos dados.
