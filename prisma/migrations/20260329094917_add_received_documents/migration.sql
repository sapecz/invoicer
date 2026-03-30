-- CreateTable
CREATE TABLE "ReceivedDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "fileName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "supplierName" TEXT,
    "supplierIc" TEXT,
    "invoiceNumber" TEXT,
    "issueDate" DATETIME,
    "dueDate" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "baseAmount" REAL,
    "vatAmount" REAL,
    "totalAmount" REAL,
    "vatRate" REAL,
    "extractedText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReceivedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
