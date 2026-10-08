# Como cadastrar o armazém

O Black Desert não oferece exportação nativa do armazém para CSV. O arquivo da plataforma é uma alternativa para quem já usa planilha; não é necessário para começar. A leitura assistida de prints já está disponível, com revisão obrigatória. Não há sincronização automática da conta do jogo.

## Cadastrar muitos materiais: captura → revisão → confirmação

1. Abra o armazém ou inventário no jogo e confira a cidade/personagem. Feche dicas ou janelas que cobrem os itens e quantidades.
2. No Windows, pressione **Win + Shift + S** e recorte a grade. Se o atalho não funcionar no jogo, use sua ferramenta de captura habitual e salve a imagem.
3. Na página **Armazém**, clique **Importar por print**. Clique na área de colagem (ou use Tab para focá-la) e pressione **Ctrl + V**. Também é possível arrastar um arquivo ou escolher PNG/JPG/WebP.
4. Ajuste o recorte às bordas dos espaços e informe linhas/colunas. A primeira leitura pode levar mais tempo; o limite é de 100 espaços por captura.
5. Clique **Ler recorte**. Confira cada item e quantidade, corrija candidatos errados e marque a revisão dos espaços incluídos.
6. Confira o local, confirme a atualização e clique **Atualizar armazém**. Não será aplicado nenhum reconhecimento sem sua revisão.

Importe uma captura por vez. Se o mesmo material aparecer em várias pilhas ou prints, confira a quantidade total e inclua um único registro por item/local: a importação **substitui**, não soma. Itens fora da captura permanecem cadastrados. A junção automática de capturas com rolagem ainda não está implementada.

A imagem fica na memória do navegador; não vai para o servidor ou backup. A precisão ainda não foi medida com amostras representativas do jogo, portanto esse fluxo não tem garantia de ser mais rápido que o manual em qualquer captura. Ver [tutorial completo de prints](print-import-tutorial.md).

## Cadastrar poucos materiais: busca manual

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

## Qual caminho escolher?

- **Muitos materiais:** experimentar print, com revisão. Não exige planilha nem códigos digitados.
- **Poucos materiais ou imagem difícil de ler:** busca manual por nome e quantidade.
- **Já uso uma planilha:** CSV com prévia e confirmação.

Não é necessário cadastrar o armazém inteiro para começar a comparar receitas. Comece pelos materiais que deseja usar.
