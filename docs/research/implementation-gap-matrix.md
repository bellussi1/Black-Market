# Estado implementado e lacunas verificadas

Auditoria estática do checkout em **10/10/2026**, cruzada com o inventário de dados e as revisões dos repositórios. Este é um retrato do código local, não uma confirmação de disponibilidade de serviços externos ou de regras atuais do jogo. O staging local ativo usa o dataset de 10.685 receitas: o endpoint expõe 7.016 fórmulas de Life Skills, e a tela de Recomendações mostra 6.813 após excluir 203 relações de subproduto. O número histórico 4.406 vem da extração inicial de 08/10. Veja as [definições e a reprodução](../recipe-counts.md).

## O que já consumimos no Black Market

| Área                  | Implementado no checkout                                                                                                                                                                                                         | Limite que ainda importa                                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Itens e receitas      | Catálogo SA/pt com ficha, busca, ícones e exploração das receitas que produzem ou usam o item. Staging: 74.216 itens e 10.685 receitas ativas; endpoint e UI têm filtros diferentes.                                             | A contagem é do dataset publicado, não cobertura integral do patch. O inventário registra 730 itens sem nome localizado. Receitas com rendimento variável exigem calibração. Consulte [contagens](../recipe-counts.md).                                            |
| Referências           | Navegador genérico com coleções de NPCs, missões, conhecimento, temas, nodes, regiões, zonas, aprimoramento, habilidades, livros, lightstones e outras tabelas extraídas. Inventário registrado: 26 coleções e 87.165 registros. | Preservar JSON de origem não significa que seus campos desconhecidos sejam regras de cálculo. Imagens/atlas e relações ausentes não são preenchidos por inferência.                                                                                                |
| Produção e economia   | Calculadora recursiva compara comprar, produzir e escolhas manuais; considera impostos, estoque reservado, cotações, orçamento, tempo, peso, rendimento, subprodutos explicitamente valorizados e ciclos.                        | A fórmula escolhida para itens intermediários é a primeira do catálogo, a menos que seja selecionada manualmente. Rendimento, tempo, preço e venda continuam sujeitos a cobertura/calibração. A combinação automática da receita selecionada está descrita abaixo. |
| Mercado               | Consultas por item/região, cotações e histórico por observações. Volume 24h, 15d e 30d só é calculado quando a série tem cobertura suficiente, sem lacunas, conflitos ou reset de contador.                                      | Coleta persistente é opt-in e permanece dependente de configuração/provedor. Snapshot de preço não comprova execução de ordem ou venda imediata. A interface interna de concorrentes não é contrato de API.                                                        |
| Armazém e OCR         | Estoque pessoal, importação revisável por CSV/prints, conjunto local de calibração, gerador sintético, coletor de amostras autorizado e benchmark do leitor atual.                                                               | Sem capturas reais autorizadas suficientes para medir mundo real. No lote sintético documentado, a grade foi detectada com F1 1,0, mas a leitura exata de quantidades foi 8,16% e numerais romanos 6,67%; isso é baseline de calibração, não acurácia geral.       |
| Personagens e família | Perfil, valores pessoais, maestrias, inventário, equipamentos e planos são editados pelo usuário e importados com revisão.                                                                                                       | Não existe exportação automática de armazém/conta da Pearl Abyss. Scans não substituem confirmação humana dos campos ambíguos.                                                                                                                                     |
| Nodes e trabalhadores | Rotas por CP já investido, planos de império e comparação de tarefas usam os dados presentes no workspace.                                                                                                                       | Não há otimização global de alocação baseada em workload, habilidade e rendimento automaticamente observados. Mapa comunitário é legado e sua geometria não é verdade atual sem landmarks verificados.                                                             |

## Entrega nesta auditoria

O planejador recebeu o cenário `optimized`, uma busca exata sobre combinações binárias comprar/produzir dos materiais intermediários encontrados na fórmula produtora selecionada. A página de recomendações o executa para a quantidade informada na receita selecionada; o ranking normal do catálogo continua separado. Estoque livre é alocado antes da compra/produção quando o controle estiver ativo e continua valorado pelo preço de reposição. A busca admite até 256 combinações por padrão (configurável até 1.024); acima disso, o cenário fica pendente e não é ranqueado.

“Exata” descreve somente o espaço pesquisado para aquela fórmula e quantidade. O motor maximiza lucro econômico por hora entre essas combinações. Ele não busca todas as fórmulas alternativas nem otimiza várias receitas juntas; alternativas aninhadas não selecionadas continuam usando a primeira fórmula. A página mostra essa limitação junto ao controle.

## Lacunas prioritárias restantes

| Prioridade | Lacuna                                             | Dados necessários antes de automatizar                                                                                                                                                                              |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0         | Completar localização e proveniência do catálogo   | Nova extração do cliente legítimo por região/idioma, fingerprint de build, diff de IDs/campos e revisão de nomes sem tradução. Não usar listas externas antigas como truth atual.                                   |
| P0         | Coletar preços e histórico utilizáveis             | Provedor comunitário autorizado, região e tipo de preço explícitos, timestamps, limites de uso, cache e cobertura observada. Manter a coleta desligada até validar fonte e operação.                                |
| P1         | Comparar itens/equipamentos lado a lado            | IDs de atributos normalizados, regras atuais de aprimoramento/Caphras por item e prices regionais. O Gear já compara caminhos de upgrade; não foi encontrada uma página geral de comparação de itens no roteador.   |
| P1         | Buscar também entre fórmulas alternativas          | Relações produto → receitas por variante, compatibilidade de materiais substitutos e rendimentos calibrados. Primeiro validar igualdade de equivalência no catálogo, sem generalizar carnes, sangues ou qualidades. |
| P1         | Usar origens, drops e recompensas na ficha do item | Vínculos item–NPC–missão–zona com IDs e origem regional/patch comprovados; não converter texto bruto desconhecido em recomendação automática.                                                                       |
| P2         | Mapa de coleta e atlas completo                    | Coordenadas com pelo menos três pontos independentes e erro residual publicado, direitos de tiles/imagens e atualização por patch. Algoritmo A\* naval não substitui rota de CP ou coordenada do mapa terrestre.    |
| P2         | Otimizar o império de trabalhadores globalmente    | Tempo, produção por worker/skill, distância, consumo, alojamento e CP calibrados por região. Hoje, resultados calculados a partir de valores informados não comprovam rendimento real.                              |

## Como conseguir mais dados com confiança

1. **Referência estática:** reexecutar o extractor local após atualizações do cliente; registrar build/idioma/região, hashes, contagens, campos novos e diferenças. Publicar primeiro em staging e revisar mudanças de schema.
2. **Mercado:** coletar somente por um adaptador comunitário permitido, com chave regional e timestamps; preservar `unknown` quando houver gap, contador regressivo, conflito ou preço base em lugar de última venda.
3. **Dados pessoais:** continuar com importação do próprio usuário e prints autorizados. Separar captura bruta, rótulo revisado, consentimento e métricas; não tratar imagem sintética como validação de mundo real.
4. **Conhecimento comunitário:** receber correções com fonte, região, patch/data, autor e estado de revisão. Manter valores de guia separados dos campos extraídos do cliente.
5. **Sites de referência:** observar recursos, rótulos e fluxo de uso para orientar uma implementação própria; não depender de endpoints internos sem contrato, nem copiar bases/tiles/imagens sem permissão.

## Licenças e exclusões técnicas

As revisões locais indicam restrições não comerciais no `bdo-viewer` e no `bdo-data-extractor`, e código de automação/memória fora do escopo. Portanto, podemos usar essas análises como referências conceituais, mas não incorporar código ou dados cobertos por essas condições em uma publicação comercial. Revalidar cada `LICENSE` e os direitos dos assets separadamente antes de distribuir qualquer artefato.

## Evidência local

- [Inventário das extrações](../extracted-data-inventory.md)
- [Procedência e atualização de dados](../data-pipeline.md)
- [Cobertura do produto](../feature-coverage.md)
- [Análise de calculadoras e mapas](repository-review-calculators-maps.md)
- [Análise dos extractors](repository-review-extraction.md)
- [Base de conhecimento dos repositórios e sites](master-bdo-knowledge-base.md)
- [Limites do OCR e métricas](../ocr-validation.md)
