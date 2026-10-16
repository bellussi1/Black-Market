DROP INDEX "roadmap_entries_kind_order_uidx";--> statement-breakpoint
WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      ORDER BY
        CASE "kind"
          WHEN 'flow' THEN 0
          ELSE 1
        END,
        "sort_order",
        "id"
    ) - 1 AS "next_sort_order"
  FROM "roadmap_entries"
)
UPDATE "roadmap_entries" AS target
SET "sort_order" = ordered."next_sort_order"
FROM ordered
WHERE target."id" = ordered."id";--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_entries_sort_order_uidx" ON "roadmap_entries" USING btree ("sort_order");