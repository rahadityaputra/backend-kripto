/*
  Warnings:

  - You are about to drop the column `gender` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `profiles` DROP COLUMN `gender`;

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(512) NOT NULL;
