import jwt from 'jsonwebtoken';

interface TokenPayload {
    userId: number;
    email: string;
}

class JWTUtils {
    private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-here';
    private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here';
    private static readonly ACCESS_TOKEN_EXPIRY = '1m';
    private static readonly REFRESH_TOKEN_EXPIRY = '5m';

    static generateAccessToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
    }

    static generateRefreshToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.JWT_REFRESH_SECRET, { expiresIn: this.REFRESH_TOKEN_EXPIRY });
    }

    static verifyAccessToken(token: string): TokenPayload {
        return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    }

    static verifyRefreshToken(token: string): TokenPayload {
        return jwt.verify(token, this.JWT_REFRESH_SECRET) as TokenPayload;
    }


    static generateCardToken(userId:number, ttlSeconds=60*60*24){
        const payload = { userId };
        return jwt.sign(payload, this.JWT_SECRET, { expiresIn: ttlSeconds });
      }
      
    static verifyCardToken(token:string){
        try {
          return jwt.verify(token, this.JWT_SECRET) as any;
        } catch (e) {
          return null;
        }
      }
}

export default JWTUtils;
