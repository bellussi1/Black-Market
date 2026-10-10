# Tiers de crafting e receitas regionais — 10/10/2026

O grafo organiza a árvore por profundidade, incluindo métodos de obtenção e locais. Cada tier tem uma única coordenada vertical, calculada pela maior altura medida de seus cards. Pais ficam centralizados nas faixas horizontais de seus descendentes. As conexões só se deslocam horizontalmente no espaço vazio entre tiers; os ramos de pais diferentes ocupam faixas separadas.

Ao reorganizar, o viewport compensa o deslocamento do card selecionado. Cards, conexões e compensação mudam juntos, evitando conexões temporariamente soltas. As animações de entrada e saída e as transições de borda, fundo e destaque dão confirmação visual. A preferência de redução de movimento continua respeitada. A largura do grafo pode aumentar; zoom e arraste permitem navegar, inclusive no celular, sem expandir a largura da página.

Validação: 258 testes do frontend, lint e build passaram. Playwright conferiu Edania com 69 cards em sete tiers; todos os cards de cada tier estavam alinhados e nenhuma das amostras das conexões entrou no interior de outro card. Em 390 × 844 px, a página não teve overflow horizontal. Captura local: `output/playwright/crafting-tiers.png`.

## Dados regionais

O patch `scripts/patches/extractor-sa-recipes.patch` usa os XMLs portugueses de `ui_html/xml/sa` quando região e idioma são SA/pt. A seleção por nome numérico exclui os arquivos espanhóis `_es_`. A preparação do extractor reaplica o patch de forma reproduzível. Os testes Go de `internal/tables` e `internal/build` passaram.

A extração regional gerou 13.313 relações brutas. Foram isolados 292 registros com referências a IDs ausentes do catálogo em `invalid-recipe-references.json`, preservado no diretório local da extração. O script `quarantine-invalid-recipes.mjs` faz essa separação antes da importação, sem criar IDs artificiais. A normalização dos registros válidos produziu 10.683 receitas.

A primeira publicação regional serviu 7.014 receitas de profissões. A auditoria sobre todos os registros encontrou zero divergências entre API e extração, zero duplicações equivalentes e zero divergências de quantidade nas fórmulas comparáveis aos XMLs regionais e às descrições analisadas. Isso não certifica o comportamento do servidor para variantes legadas sem XML regional.

A publicação final tem 10.685 receitas, incluindo 7.016 de profissões, com checksum `774bceba02a1536c940963c0a5fd992e11131157f82664e0e9f13c7f228f2987`. A auditoria final (`data/audits/production-recipes-final.json`) confirmou zero erros estruturais, duplicações, diferenças entre API e fonte e divergências de quantidades comparáveis. Nenhum candidato de fabricação ficou pendente nas descrições analisadas. Duas relações regionais de aquecimento (Melodia das Estrelas e Luz de Dekia) continuam entre as referências inválidas, sem publicação de fórmulas incompletas.

A revisão manual das descrições restantes identificou duas fórmulas completas adicionais, incluídas no suplemento com rendimento desconhecido:

- Cristal Variegado Bruto #5304: cristais Translúcido #4466, Lama #4467, Negro #4470, Azul #4483 e Violeta #4485, 50 unidades de cada.
- Pedra de Espírito Impecável #5305: Óleo de Tranquilidade #6605 ×10, Fonte da Vida Persistente #5303 ×4 e Cristal Variegado Bruto #5304 ×4.

Essas composições vieram das descrições portuguesas do próprio cliente revisado; os links de contexto do suplemento não substituem essa evidência local. O suplemento continua vinculado ao checksum exato da extração revisada e à identidade de cada item.

Os outros cinco candidatos das descrições — Reagente da Amizade com Espírito, Sangue de Turo Rígido, Essência da Perspicácia, Coração dos Turos e Coral de Rusalka — mostram receitas em que são ingredientes. Sua obtenção é missão, combate ou coleta. A auditoria agora evita classificá-los como produtos sem receita com base em uma lista que contém o próprio ingrediente.

Persistem limitações reais de fonte: resultados e probabilidades ausentes ficam desconhecidos; as referências inválidas não são publicadas; relações de equipamentos com IDs especiais exigem revisão da codificação de aprimoramento. Materiais obtidos por compra, missão, coleta ou combate não recebem fórmulas de fabricação inventadas. Inventários pessoais não foram alterados. Cada publicação fez backup e preservou a versão anterior.
