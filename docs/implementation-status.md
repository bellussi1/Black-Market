# Funcionalidades principais — estado de implementação

Em 08/10/2026, o código implementa os seguintes escopos MVP:

- Referências: receitas pesquisáveis, fichas compartilháveis e dados de NPCs, missões, conhecimento, habilidades, classes, locais, aprimoramento e Caphras.
- Personagem: prata, energia, 11 maestrias, equipamentos ligados ao catálogo, PA principal/despertar e PD.
- Recomendações: sessões observadas, produção e estoque, orçamento/energia/tempo; limitações e preços antigos explícitos.
- Planos: tarefas, materiais, reservas sem duplicar quantidades e estados que liberam reservas sem debitar estoque.
- Império de nodes/trabalhadores: cadastro de trabalhadores/tarefas, custos de cidade/alojamento, rotas com CP compartilhado e comparação diária; [uso e limites](worker-empire.md).
- Prints: números e candidatos de ícones, recorte arrastável ou numérico, revisão obrigatória antes de alteração.
- Contas: Google/Steam com sessão Firebase e dono canônico implementados; configuração Firebase e validação de login real pendentes.
- Mercado: consultas normalizadas persistidas, histórico por variante; coletor configurável OFF.
- Público: SSR e HTML de itens/receitas/referências/Home/legal, SEO básico, footer, privacidade, analytics preparado e deploy.

## Evidência e dependências

Catálogo ativo SA/pt: 74.216 itens, 212 categorias e 10.685 receitas distintas; 26 coleções de referência e 87.165 registros. Índice visual: 18.116 assinaturas. O endpoint de Life Skills retorna 7.016 linhas, das quais 203 são relações de subproduto; Recomendações recebe 6.813 fórmulas elegíveis. O banco preserva versões anteriores; não confundir contagem total de `item_versions` com catálogo ativo. Definições e extração anterior em [contagens de receitas](recipe-counts.md).

730 itens não têm nome localizado; localização inglesa e atlas/imagens de NPC não estão disponíveis. Fármaco da Harmonia (1399) aparece na busca e ficha, mas não tem receita importada. Dados ausentes não são inventados.

Contas exigem configurar os projetos Firebase separados e testar Google/Steam em navegador real; não há senha, OTP ou mesclagem por e-mail. Staging oferece até dez convites, mas a UID do tester designado ainda deve ser configurada antes do seed AuroraVale/ValeDourado. Arsha não foi aprovado como fonte automática; coletores periódicos ficam OFF por padrão e a consulta sob demanda continua identificada como comunitária. Prints usam heurística; não há avaliação independente de captura real. Recomendações não inventam curva de coleta por maestria. O império de trabalhadores calcula resultados informados e CP compartilhado; ainda não modela automaticamente workload, distância, habilidades, drops ou a melhor alocação global. Não há paridade integral com Workerman.

Consultar [auditoria final](production-audit.md) para separar PASSOU de NÃO VERIFICADO. Implementação MVP não significa reprodução integral dos concorrentes, validade jurídica ou operação pública ativada. Publicidade continua OFF até resolução da licença dos dados.

## Atualização de pesquisa em 10/10/2026

- O comparador de recomendações inclui uma combinação automática comprar/produzir para a receita selecionada, com limite padrão de 256 combinações; ver [matriz de lacunas](research/implementation-gap-matrix.md).
- O código deriva volumes de mercado 24h/15d/30d quando a cobertura observada é contínua. Coletor/provedor e histórico confiável continuam dependentes de configuração e disponibilidade externa.
- As contagens foram conciliadas: 10.685 no dataset ativo, 7.016 de Life Skills no endpoint e 6.813 após filtro de relações de subproduto na tela; 4.406 pertence à extração antiga. Ver [detalhamento](recipe-counts.md).
- A página de referências já inclui conhecimento e temas. Os campos brutos adicionais não interpretados continuam fora de regras de cálculo.
