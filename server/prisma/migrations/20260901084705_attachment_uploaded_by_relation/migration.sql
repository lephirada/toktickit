-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
