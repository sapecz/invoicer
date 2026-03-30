-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" DATETIME,
    "dueDate" DATETIME,
    "duePreset" TEXT,
    "bankAccount" TEXT,
    "taxDate" DATETIME,
    "constantSymbol" TEXT,
    "specificSymbol" TEXT,
    "variableSymbol" TEXT,
    "invoiceText" TEXT,
    "includeVat" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("bankAccount", "createdAt", "customerId", "dueDate", "id", "status", "taxDate", "updatedAt", "userId") SELECT "bankAccount", "createdAt", "customerId", "dueDate", "id", "status", "taxDate", "updatedAt", "userId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
