import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { logger } from '../config/logger.config';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const identityBucket = process.env.SUPABASE_IDENTITY_CARD_BUCKET!;
const avatarBucket = process.env.SUPABASE_AVATAR_BUCKET!;
const membershipCardBucket = process.env.SUPABASE_MEMBERSHIP_CARD_BUCKET!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseStorageService {
    static async uploadEncryptedImage(
        encryptedBuffer: Buffer,
        userId: number,
        fileExt: string = "png" // default jika tidak diberikan
    ): Promise<string | null> {
        try {
            logger.info("Supabase URL: " + supabaseUrl);
            logger.info("Storage Bucket: " + identityBucket);
            logger.info(`Uploading encrypted identity card for user ID: ${userId}`);

            const fileName = `${userId}-identity-card.${fileExt}`;

            const { data, error } = await supabase.storage
                .from(identityBucket)
                .upload(fileName, encryptedBuffer, {
                    contentType: `image/${fileExt}`,
                    cacheControl: "3600",
                    upsert: false,
                });

            if (error) {
                logger.error("Upload failed:", error.message);
                throw error;
            }

            // Ambil public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from(identityBucket).getPublicUrl(fileName);

            logger.info("Encrypted membership image uploaded successfully:", publicUrl);
            return publicUrl;

        } catch (err) {
            logger.error("Error uploading encrypted membership card:", err);
            return null;
        }
    }


    static async uploadBufferAsImage(buffer: Buffer, userId: string, filename: string) {
        const filePath = `${userId}/${filename}`;

        const { data, error } = await supabase.storage
            .from(membershipCardBucket) // bucket tujuan akhir
            .upload(filePath, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) throw error;

        const { data: dataUrl } = supabase.storage
            .from(membershipCardBucket)
            .getPublicUrl(filePath);

        return dataUrl.publicUrl;
    }

    static async uploadAvatarImage(buffer: Buffer, filename: string): Promise<string | null> {
        try {
            const { data, error } = await supabase.storage
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
            const { data: { publicUrl } } = supabase.storage
                .from(avatarBucket)
                .getPublicUrl(`avatars/${filename}`);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading avatar image:', error);
            return null;
        }
    }

    static async deleteImage(fileName: string): Promise<boolean> {
        try {
            const { error } = await supabase.storage
                .from(identityBucket)
                .remove([fileName]);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }


    static async getImageUrl(fileName: string): Promise<string | null> {
        try {
            const { data: { publicUrl } } = supabase.storage
                .from(identityBucket)
                .getPublicUrl(fileName);


            return publicUrl;
        } catch (error) {
            console.error('Error getting image URL:', error);
            return null;
        }
    }


    static async loadOriginalMembershipBuffer(userId: string): Promise<Buffer> {

        logger.info("load original membercard for userId", userId);
        const originalPath = `${userId}/original-membership-card.png`;

        const { data, error } = await supabase.storage
            .from(membershipCardBucket) // nama bucket
            .download(originalPath);

        if (error) {
            throw new Error(`Failed to load original membership image: ${error.message}`);
        }

        // data adalah Blob → convert ke Buffer
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }


    static async downloadFile(path: string) {
        const { data, error } = await supabase.storage
            .from(membershipCardBucket)
            .download(path);

        console.log("hasil download supabase",data);
        if (error) throw new Error(error.message);
        return data; 
    }

    static async getIdentityCardUrl(userId: string) {
        const filePath = `${userId}-identity-card.png`; // path file di bucket
        const { data, error } = await supabase
          .storage
          .from(identityBucket)   // nama bucket
          .createSignedUrl(filePath, 60); // URL berlaku 60 detik
      
        if (error) throw error;
        return data.signedUrl;
      }

    static async downloadIdentityCard(path: string) {
        const { data, error } = await supabase.storage
            .from(identityBucket)
            .download(path);

        console.log("hasil download supabase",data);
        if (error) throw new Error(error.message);
        return data; 
    }
    
}