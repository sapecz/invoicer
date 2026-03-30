-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL DEFAULT 'md',
    "days" INTEGER,
    "budget" REAL,
    "mdRate" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "daysUsed" REAL NOT NULL DEFAULT 0,
    "budgetUsed" REAL NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("archived", "budgetUsed", "createdAt", "currency", "days", "daysUsed", "id", "mdRate", "name", "userId") SELECT "archived", "budgetUsed", "createdAt", "currency", "days", "daysUsed", "id", "mdRate", "name", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
