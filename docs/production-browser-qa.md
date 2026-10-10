# Validação de produção, crafting e importação — 10/10/2026

## Como testar

Abra `/recommendations` (O que fazer), clique **Criar personagem de teste**, aguarde o catálogo e use **Aplicar preços fictícios para testar**. Clique **Comparar lucro por hora**. Os preços desse botão são premissas manuais, não preços atuais. Para trabalhar com o mercado, use **Consultar mercado**; consultas incompletas podem ser retomadas. Campos sem cotação/rendimento/peso/tempo ficam pendentes.

AuroraVale e o estoque usam identidades reais do catálogo; seus níveis, quantidades, prata, peso e medições são fictícios. O modo usa memória, mostra um aviso global e preserva o espaço original. Sair restaura os dados; recarregar encerra o teste. Importações feitas durante a demonstração ficam nesse mesmo espaço temporário.

O ranking compara compra, produção recursiva e escolhas por ingrediente. Desembolso é separado do valor de reposição dos materiais próprios, faturamento bruto e recebimento após impostos. Reservas são descontadas antes da alocação. Toda produção intermediária conta no tempo. Lotes são otimizados exatamente até 10.000 operações, sujeitos aos limites informados. A comparação inclui somente receitas no escopo escolhido e fórmulas/medidas informadas; não prova um máximo global entre combinações arbitrárias de variantes.

Maestria efetiva, equipamento e trajes identificam as condições da medição. Não há multiplicadores de maestria inventados: informe/calibre segundos e rendimento no conjunto que vai usar. Subprodutos sem medição e variantes com rendimento ausente não geram renda automática. Quantidades de saída esperadas podem ser fracionárias; não representam uma garantia de produção ou venda.

## Evidência Playwright

| Fluxo                                                                           | Resultado observado                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Início, mercado, receitas, armazém, família, materiais e páginas institucionais | Navegação e títulos renderizados; sem overflow horizontal na largura desktop testada.                                                                                                                                                       |
| Mercado                                                                         | 20, 50 e 100 linhas reais; avançar para 101–200; busca por #5301 fora da lista em alta.                                                                                                                                                     |
| Cotação e histórico                                                             | Reagente Líquido Limpo: preço e estoque consultados; seis observações exibidas. Liquidez sem cobertura de 24h permanece indisponível.                                                                                                       |
| Receitas Edania                                                                 | #1407 mostra oito variantes. Expandir Edania abre cinco materiais; selecionar Sangue do Pecador destaca produto, Edania e Sangue.                                                                                                           |
| Layout de crafting                                                              | Duas colunas; expansão para baixo, cards existentes preservados; raiz identificada, bordas do caminho e linhas reforçadas. Unidade cobre uma coluna em viewport estreito, zoom/pan e seleção de origens.                                    |
| Materiais                                                                       | Salvar lista do produto, abrir quatro materiais/quantidades, remover, desfazer e remover o plano de teste.                                                                                                                                  |
| O que fazer                                                                     | Demonstração com 15 cenários completos de Edania; compra, produção com estoque e personalização, custos e faturamento separados.                                                                                                            |
| Equipamentos                                                                    | Fixture de 13 slots com ícones reais, sem alegar captura real do jogo. Treze candidatos; identidade compartilhada exige revisão. Escolhido #11101, posição elmo, nível19, Caphras0; salvou TET (IV) na Família e preservou os demais slots. |
| Armazém                                                                         | Captura real de referência `14-storage.png`, grade esquerda 9×10 vazia/com bloqueios. Sem importação automática. Detecção conservadora reduziu 45 pendências para o botão “+”; nenhum item confirmado.                                      |
| Inventário                                                                      | Captura real `06-shop-inventory.png`, recorte manual da janela direita. Leitura ambígua permaneceu pendente; escolhido #517 e quantidade38 conferida visualmente; salvou no inventário de AuroraVale.                                       |

Arquivos locais em `output/playwright/`: `gear-fixture.png`, `inventory-review-first.png`, `crafting-vertical-path.png`. São evidências/fixtures de teste, não assets do produto. Snapshots adicionais ficam em `.playwright-mcp/`; ambos os diretórios são ignorados pelo Git.

## Correções encontradas durante a revisão

- Escolha do tipo/destino antes de enviar; primeira análise depende de conferência do recorte.
- Destino de novas capturas separado da captura ativa; criar um personagem atualiza o destino correto.
- Reconhecimento do cadeado conhecido tolera deslocamentos dos gutters; pode ser desativado para revisar tudo. Não se aplica aos equipamentos.
- Saída da demonstração durante carregamento não reaplica premissas fictícias ao espaço real.
- Cotações agregadas de equipamentos aprimoráveis não entram automaticamente nos custos.
- Cache de preços de produção separado do mercado; consultas limitadas e retomáveis.
- Busca exata de lotes evita assumir que o maior lote dá o maior lucro/h. Mesclar resultados preserva a razão exata antes do arredondamento exibido.
- Comparação em blocos, com progresso e cancelamento se dados/condições mudarem.
- Pacotes locais excluídos do prebundle de desenvolvimento: após reinícios, o cache antigo do navegador não deve substituir as novas rotas/calculadoras.
- A opção “Árvore visual” também funciona no celular: em 390px, cinco cards em uma coluna, sem overflow horizontal. O CSS anterior ocultava o diagrama mesmo com a opção selecionada. “Etapas expansíveis” continua disponível.

## Verificação e limites

412 testes automatizados: 40 calculadoras, 124 API e 248 web. Lint dos arquivos/pacotes alterados e de toda a aplicação web, build API+web em Docker e smoke SSR passaram. A correção do catálogo tem backup e procedência em `edania-recipe-correction.md`.

As capturas reais anexadas são pequenas e incluem menus antigos. O exemplo de inventário não forneceu automaticamente o item/quantidade corretos; busca manual e conferência foram necessárias. Equipamentos foram validados com fixture controlada e regressões; isso não comprova precisão em toda captura real de gear. A importação não confirma identidades compartilhadas, aprimoramento, Caphras ou abreviações por conta própria.

O provedor teve falhas temporárias em algumas consultas em lote e respondeu em outras. Histórico ainda incompleto não sustenta volumes de 15/30 dias ou liquidez inventada. Os testes de navegador cobrem os fluxos acima; não constituem cobertura exaustiva de toda combinação de formulário, variante, screenshot e dispositivo. Alertas de bundle inicial (~939KB), locale pt-BR→pt e CommonJS do Tesseract continuam conhecidos.
