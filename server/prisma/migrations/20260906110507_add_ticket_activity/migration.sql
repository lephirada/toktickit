-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");

-- CreateIndex
CREATE INDEX "TicketActivity_createdAt_idx" ON "TicketActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
