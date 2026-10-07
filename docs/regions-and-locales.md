# Mercados e idiomas

## Foco inicial

- Mercado: América do Sul (`sa`).
- Interface e formatação: português brasileiro (`pt-BR`).
- Idioma preferido dos nomes de dados: português (`pt`).
- Catálogo alternativo: inglês (`en`), quando a fonte não fornece português.

`packages/shared/src/markets.ts` reúne padrões, códigos conhecidos, idiomas de dados, cobertura do conector e disponibilidade do produto. A configuração inicial habilita SA. Outras regiões ficam preparadas para ativação posterior; uma região já salva em dados pessoais continua acessível, e o backup conserva os registros de todas as regiões.

Mercado e idioma são independentes. Traduzir a interface não muda o servidor do jogo nem converte preços entre mercados. A API mantém SA como padrão e conserva o suporte já existente a NA/EU. Preferências regionais e registros pessoais continuam separados por região.

## Interface Angular

Usamos o [i18n nativo do Angular](https://angular.dev/guide/i18n), com `@angular/localize`, `i18n` nos templates e `$localize` nos textos de código preparados para tradução. A língua fonte é `pt-BR`; o arquivo XLIFF 2 está em `apps/web/src/locale/messages.pt-BR.xlf`. Não publicamos traduções artificiais em inglês/espanhol.

`core/locale.ts` identifica o idioma do build; formatos de prata, números e datas usam essa mesma configuração. `LOCALE_ID` e os dados locais do Angular também são configurados. O Angular usa os dados CLDR `pt` para `pt-BR` e pode registrar essa resolução como aviso no build; o idioma do produto continua brasileiro. Timestamps permanecem ISO/UTC nos registros, com exibição no fuso do navegador.

Extraia novamente as mensagens depois de alterar textos:

```powershell
pnpm --filter @bdo/web i18n:extract
```

Para adicionar um idioma:

1. Criar um XLIFF de destino com os mesmos IDs, fontes e placeholders, e traduções revisadas.
2. Registrá-lo em `projects.web.i18n.locales` no `angular.json`, por exemplo `"en-US": "src/locale/messages.en-US.xlf"`.
3. Configurar o mapeamento do idioma de dados quando necessário e executar `ng build --localize` pelo frontend.
4. Publicar os diretórios gerados com fallback de SPA para cada locale e links entre os builds.

Textos novos devem usar `i18n`/`$localize`. Mensagens dinâmicas de validação, textos vindos da API e trechos dentro de expressões ainda precisam de revisão ao publicar outro idioma; são atualmente mensagens em português. Conteúdo digitado pelo usuário e nomes recebidos das fontes não são traduzidos pelo i18n da interface.

## Mercado e catálogo

`GET /api/v1/market/items/:id?region=sa&locale=pt` envia `lang=pt` ao Arsha. O cache e as consultas simultâneas são separados por região, ID e idioma; a resposta informa o idioma solicitado. Aliases BCP 47 como `pt-BR` são normalizados. Os códigos de idioma suportados são explícitos, não aceitamos uma URL externa enviada pelo cliente.

O suporte `pt` aparece na [configuração do Arsha](https://github.com/guy0090/api.arsha.io/blob/develop/config/application-default.yaml). Na revisão desta mudança, a instância pública respondeu HTTP 500 e informou bloqueio no upstream; não foi possível confirmar uma cotação ao vivo em português. A aplicação apresenta a indisponibilidade pelo fluxo existente, sem inventar preço ou nome localizado.

O catálogo recebe `preferredLocale=pt`: procura português, depois inglês e depois outra extração disponível, sempre na mesma região. `locale=pt` pede um idioma exato e não faz fallback. A resposta mantém o idioma real do dataset; a tela avisa quando ele difere da preferência. Nomes e descrições não são traduzidos automaticamente.

A instalação Steam SA foi extraída em português em 7 de outubro de 2026. O código do extractor fixado em `5bf11bd7` lê o arquivo local `ads/languagedata_pt.loc`, embora sua ajuda ainda liste `en/de/fr/sp`. O comando de importação conserva `en` como padrão por compatibilidade e deve receber `--locale pt` para essa saída. Importar arquivos ingleses como `pt` rotularia os dados incorretamente. Consulte [extração local](local-extraction.md).

## Novo mercado

1. Confirmar a cobertura e os códigos do provedor, datasets e regras locais.
2. Adicionar seu código em `REGION_CODES`, quando necessário, e seu rótulo traduzível no frontend.
3. Ampliar `MARKET_PROVIDER_REGIONS` apenas após confirmar o conector.
4. Importar o catálogo com região/idioma reais e habilitar sua entrada em `MARKET_ROLLOUT`.

Não reutilize cotações de SA como preços de outro mercado. A mudança de disponibilidade não exige alterar os IDs existentes dos registros nem apagar backups.
