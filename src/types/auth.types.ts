export interface UserLogin {
    email: string;
    password: string;
}

enum UserGender {
    MALE = 'MALE',
    FEMALE = 'FEMALE'
} 

export interface UserRegister {
    email: string;
    dateOfBirth: string;
    fullname: string;
    password: string;
    username: string;
    address: string;
    gender: UserGender;
}

export interface VerificationCode {
    code: string;
    userId: number;
    expiresAt: Date;
}

export interface VerificationRequest {
    email: string;
    code: string;
}

export interface AuthResponse {
    status: boolean;
    message: string;
    data?: any;
    error?: string;
}