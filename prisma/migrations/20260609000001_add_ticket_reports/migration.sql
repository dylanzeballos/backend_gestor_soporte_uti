-- CreateTable: components
CREATE TABLE "components" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ticket_reports
CREATE TABLE "ticket_reports" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "work_performed" TEXT NOT NULL,
    "resolution_type" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ticket_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ticket_report_components
CREATE TABLE "ticket_report_components" (
    "id" SERIAL NOT NULL,
    "ticket_report_id" INTEGER NOT NULL,
    "component_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_report_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "components_name_key" ON "components"("name");

-- CreateIndex
CREATE INDEX "idx_components_is_active" ON "components"("is_active");

-- CreateIndex
CREATE INDEX "idx_components_created_at" ON "components"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_reports_ticket_id_key" ON "ticket_reports"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_ticket_reports_created_by" ON "ticket_reports"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_ticket_reports_created_at" ON "ticket_reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ticket_report_component" ON "ticket_report_components"("ticket_report_id", "component_id");

-- CreateIndex
CREATE INDEX "idx_ticket_report_components_component_id" ON "ticket_report_components"("component_id");

-- AddForeignKey: ticket_reports.ticket_id -> tickets.id
ALTER TABLE "ticket_reports" ADD CONSTRAINT "ticket_reports_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ticket_reports.created_by_id -> users.id
ALTER TABLE "ticket_reports" ADD CONSTRAINT "ticket_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ticket_report_components.ticket_report_id -> ticket_reports.id
ALTER TABLE "ticket_report_components" ADD CONSTRAINT "ticket_report_components_ticket_report_id_fkey" FOREIGN KEY ("ticket_report_id") REFERENCES "ticket_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ticket_report_components.component_id -> components.id
ALTER TABLE "ticket_report_components" ADD CONSTRAINT "ticket_report_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
