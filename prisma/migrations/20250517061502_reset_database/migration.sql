/*
  Warnings:

  - You are about to drop the `problems` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProblemInPlaylist" DROP CONSTRAINT "ProblemInPlaylist_problemId_fkey";

-- DropForeignKey
ALTER TABLE "ProblemSolved" DROP CONSTRAINT "ProblemSolved_problemId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_problemId_fkey";

-- DropForeignKey
ALTER TABLE "TestCase" DROP CONSTRAINT "TestCase_problemId_fkey";

-- DropForeignKey
ALTER TABLE "problems" DROP CONSTRAINT "problems_userId_fkey";

-- DropTable
DROP TABLE "problems";

-- CreateTable
CREATE TABLE "Problems" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "tags" TEXT[],
    "userId" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "constraints" TEXT NOT NULL,
    "hints" TEXT,
    "editorial" TEXT,
    "codeSnippets" JSONB NOT NULL,
    "referenceSolutions" JSONB NOT NULL,
    "problemNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Problems_problemNumber_key" ON "Problems"("problemNumber");

-- AddForeignKey
ALTER TABLE "Problems" ADD CONSTRAINT "Problems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSolved" ADD CONSTRAINT "ProblemSolved_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemInPlaylist" ADD CONSTRAINT "ProblemInPlaylist_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
