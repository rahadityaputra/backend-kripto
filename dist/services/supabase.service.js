"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseStorageService = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = require("dotenv");
const logger_config_1 = require("../config/logger.config");
(0, dotenv_1.config)();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const identityBucket = process.env.SUPABASE_IDENTITY_CARD_BUCKET;
const avatarBucket = process.env.SUPABASE_AVATAR_BUCKET;
const membershipCardBucket = process.env.SUPABASE_MEMBERSHIP_CARD_BUCKET;
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
class SupabaseStorageService {
    static async uploadEncryptedImage(encryptedBuffer, userId, fileExt = "png" // default jika tidak diberikan
    ) {
        try {
            logger_config_1.logger.info("Supabase URL: " + supabaseUrl);
            logger_config_1.logger.info("Storage Bucket: " + identityBucket);
            logger_config_1.logger.info(`Uploading encrypted identity card for user ID: ${userId}`);
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const { data, error } = await exports.supabase.storage
                .from(identityBucket)
                .upload(fileName, encryptedBuffer, {
                contentType: `image/${fileExt}`,
                cacheControl: "3600",
                upsert: false,
            });
            if (error) {
                logger_config_1.logger.error("Upload failed:", error.message);
                throw error;
            }
            // Ambil public URL
            const { data: { publicUrl }, } = exports.supabase.storage.from(identityBucket).getPublicUrl(fileName);
            logger_config_1.logger.info("Encrypted membership image uploaded successfully:", publicUrl);
            return publicUrl;
        }
        catch (err) {
            logger_config_1.logger.error("Error uploading encrypted membership card:", err);
            return null;
        }
    }
    static async uploadBufferAsImage(buffer, userId, filename) {
        const filePath = `${userId}/${filename}`;
        const { data, error } = await exports.supabase.storage
            .from(membershipCardBucket) // bucket tujuan akhir
            .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true
        });
        if (error)
            throw error;
        const { data: publicUrl } = exports.supabase.storage
            .from(membershipCardBucket)
            .getPublicUrl(filePath);
        return publicUrl.publicUrl;
    }
    static async uploadAvatarImage(buffer, filename) {
        try {
            const { data, error } = await exports.supabase.storage
                .from(avatarBucket)
                .upload(`avatars/${filename}`, buffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: true
            });
            if (error) {
                throw error;
            }
            // Get public URL
            const { data: { publicUrl } } = exports.supabase.storage
                .from(avatarBucket)
                .getPublicUrl(`avatars/${filename}`);
            return publicUrl;
        }
        catch (error) {
            console.error('Error uploading avatar image:', error);
            return null;
        }
    }
    static async deleteImage(fileName) {
        try {
            const { error } = await exports.supabase.storage
                .from(identityBucket)
                .remove([fileName]);
            if (error) {
                throw error;
            }
            return true;
        }
        catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }
    static async getImageUrl(fileName) {
        try {
            const { data: { publicUrl } } = exports.supabase.storage
                .from(identityBucket)
                .getPublicUrl(fileName);
            return publicUrl;
        }
        catch (error) {
            console.error('Error getting image URL:', error);
            return null;
        }
    }
    static async loadOriginalMembershipBuffer(userId) {
        logger_config_1.logger.info("load original membercard for userId", userId);
        const originalPath = `${userId}/original-membership-card.png`;
        const { data, error } = await exports.supabase.storage
            .from(membershipCardBucket) // nama bucket
            .download(originalPath);
        if (error) {
            throw new Error(`Failed to load original membership image: ${error.message}`);
        }
        // data adalah Blob → convert ke Buffer
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    static async downloadFile(path) {
        const { data, error } = await exports.supabase.storage
            .from(membershipCardBucket)
            .download(path);
        console.log("hasil download supabase", data);
        if (error)
            throw new Error(error.message);
        return data;
    }
}
exports.SupabaseStorageService = SupabaseStorageService;
