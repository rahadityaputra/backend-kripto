/*
  Warnings:

  - Added the required column `address` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `profiles` ADD COLUMN `address` VARCHAR(1000) NOT NULL;
