DROP INDEX "roadmap_entries_kind_order_uidx";--> statement-breakpoint
WITH ordered_entries AS (
  SELECT id,
    row_number() OVER (
      ORDER BY CASE kind WHEN 'flow' THEN 0 ELSE 1 END, sort_order, id
    ) - 1 AS global_order
  FROM "roadmap_entries"
)
UPDATE "roadmap_entries" AS entry
SET sort_order = ordered_entries.global_order
FROM ordered_entries
WHERE entry.id = ordered_entries.id;
--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_entries_sort_order_uidx" ON "roadmap_entries" USING btree ("sort_order");
