CREATE TYPE "public"."roadmap_entry_kind" AS ENUM('flow', 'pillar');--> statement-breakpoint
CREATE TABLE "roadmap_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"kind" "roadmap_entry_kind" NOT NULL,
	"sort_order" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"summary" varchar(280) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status_label" varchar(60),
	"icon" varchar(64) NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_entries_order_check" CHECK ("roadmap_entries"."sort_order" >= 0),
	CONSTRAINT "roadmap_entries_slug_check" CHECK ("roadmap_entries"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_entries_slug_uidx" ON "roadmap_entries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_entries_kind_order_uidx" ON "roadmap_entries" USING btree ("kind","sort_order");
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'black_market_app') THEN
		EXECUTE 'GRANT SELECT, INSERT, DELETE ON public.roadmap_entries TO black_market_app';
	END IF;
END $$;
--> statement-breakpoint
INSERT INTO "roadmap_entries" (
	"id", "slug", "kind", "sort_order", "title", "summary", "description",
	"status_label", "icon", "featured", "links", "updated_at"
) VALUES
	('00000000-0000-4000-8000-000000000101', 'your-context', 'flow', 0, 'Seu contexto', 'Armazém, Maestria, cotações e tempo.', 'As informações do jogador e do Mercado formam a base da comparação.', NULL, 'lucideBoxes', false, '[]'::jsonb, now()),
	('00000000-0000-4000-8000-000000000102', 'your-options', 'flow', 1, 'Suas opções', 'Comprar, coletar ou produzir o que falta.', 'A cadeia pode incluir subitens e subreceitas quando isso melhora a decisão.', NULL, 'lucideHammer', false, '[]'::jsonb, now()),
	('00000000-0000-4000-8000-000000000103', 'best-activity', 'flow', 2, 'Sua melhor atividade', 'Compare receitas por lucro por hora.', 'Os resultados precisam mostrar custos, retornos, origem dos preços e dados pendentes.', NULL, 'lucideCompass', false, '[]'::jsonb, now()),
	('00000000-0000-4000-8000-000000000111', 'market', 'pillar', 0, 'Mercado', 'Consulte preços e disponibilidade do Mercado Central.', 'As cotações também alimentam as simulações de produção. Confira a região e a idade do preço.', 'Disponível', 'lucideStore', false, '[{"label":"Abrir mercado","path":"/market"}]'::jsonb, now()),
	('00000000-0000-4000-8000-000000000112', 'crafting', 'pillar', 1, 'Crafting', 'Explore receitas e simule a cadeia de produção.', 'Compare materiais, rendimentos, subreceitas e alternativas disponíveis no catálogo.', 'Disponível', 'lucideHammer', false, '[{"label":"Explorar receitas","path":"/recipes"},{"label":"Calcular produção","path":"/crafting"}]'::jsonb, now()),
	('00000000-0000-4000-8000-000000000113', 'storage-scan', 'pillar', 2, 'Scan de armazém + Armazém', 'Importe capturas, revise o reconhecimento e organize quantidades por local.', 'A revisão confirma o que entra no estoque; o reconhecimento de imagens e quantidades continua em evolução.', 'Em evolução', 'lucideWarehouse', false, '[{"label":"Importar captura","path":"/scans"},{"label":"Abrir armazém","path":"/storage"}]'::jsonb, now()),
	('00000000-0000-4000-8000-000000000114', 'what-to-do', 'pillar', 3, 'O que fazer?', 'Encontre o melhor uso para seu estoque, Maestria e tempo.', 'A direção é comparar compra, coleta e produção de subitens/subreceitas para recomendar atividades por lucro por hora, mesmo quando faltam ingredientes.', 'Em evolução', 'lucideCompass', true, '[{"label":"Ver recomendações","path":"/recommendations"}]'::jsonb, now());
