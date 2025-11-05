

import axios from 'axios';
import { logger } from '../config/logger.config';

class AvatarUtils {

    static async generateAvatarImageFile(fullname: string): Promise<Buffer> {
        try {
            const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${fullname}&backgroundColor=00897b,039be5,1e88e5,3949ab,43a047,5e35b1,7cb342,8e24aa,c0ca33,d81b60,e53935,f4511e,fb8c00,fdd835,ffb300&fontFamily=Arial`;

            const avatar = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            const avatarBuffer = Buffer.from(avatar.data, 'binary');
            return avatarBuffer;
        } catch (error) {
            logger.error(`Generate avatar image error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
}

export default AvatarUtils;
