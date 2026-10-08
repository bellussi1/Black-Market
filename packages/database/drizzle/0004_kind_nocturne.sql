CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "item_translations_name_search_idx" ON "item_translations" USING gin (translate(lower("name"), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') gin_trgm_ops);
