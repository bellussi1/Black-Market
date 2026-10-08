# Como cadastrar o armazém

O Black Desert não oferece exportação nativa do armazém para CSV. O Black Market ainda não importa prints automaticamente. Não há sincronização da conta do jogo.

## Começar sem planilha

1. Abra seu armazém no jogo e anote a cidade. Para inventário, use o nome do personagem como local.
2. No Black Market, abra **Armazém e projetos** e confirme a região.
3. Em **Adicionar ou editar material**, procure pelo nome do item e selecione o resultado. A busca também aceita nomes sem acentos e códigos.
4. Copie a quantidade exibida no jogo e confira o local. Velia é apenas o local inicial do formulário; troque-o se necessário.
5. Salve. Repita para os materiais que deseja acompanhar. Não é necessário cadastrar tudo de uma vez.

Meta e preço podem ficar em zero. Preço manual é uma estimativa sua, não uma cotação atual do mercado.

## Usar uma planilha

Você pode exportar os materiais já cadastrados na plataforma, editar as quantidades e importar o mesmo arquivo. Materiais antigos sem código precisam ser associados a um item pela busca antes de exportar.

Para começar uma planilha do zero:

1. Clique em **Baixar modelo** na seção de importação.
2. Abra o arquivo em Excel, LibreOffice ou outro editor. Caso todas as colunas apareçam juntas, escolha ponto e vírgula como separador.
3. Mantenha o cabeçalho `itemId;quantidade;local;meta;preco`.
4. Busque o item no Black Market para obter seu código, preencha quantidade e local. Mantenha as colunas de meta e preço, mesmo quando vazias.
5. Salve como **CSV UTF-8**, separado por ponto e vírgula. Não coloque separadores de milhar no preço.
6. Selecione o arquivo no Black Market, percorra as páginas da prévia e confirme após revisar.

Exemplo ilustrativo, **não representa o estoque de um usuário**:

```csv
itemId;quantidade;local;meta;preco
1399;20;Velia;;
```

O item 1399 é Fármaco da Harmonia no catálogo SA/pt. A quantidade 20 é apenas um exemplo. O limite é de 500 linhas/200 KB por arquivo; não repita o mesmo item/local.

## O que a importação altera

- Substitui a quantidade do mesmo código/local na região selecionada; não soma.
- Mantém materiais fora do arquivo.
- Meta/preço vazios preservam os valores existentes; em registros novos, começam em zero.
- Recusa códigos ausentes no catálogo e duplicatas ambíguas.
- Os materiais ficam neste navegador. Faça backup antes de limpar os dados ou trocar de dispositivo.

## Prints

O fluxo planejado será: escolher cidade/personagem → enviar capturas → reconhecer ícones e quantidades → tratar sobreposição → revisar → confirmar. Até a implementação estar disponível, capturas podem servir de referência visual para o cadastro manual. Não existe botão funcional de reconhecimento de prints nesta versão.
