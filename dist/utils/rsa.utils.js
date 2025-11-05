"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rsaEncrypt = rsaEncrypt;
exports.rsaDecrypt = rsaDecrypt;
exports.rsaEncryptFields = rsaEncryptFields;
exports.rsaDecryptFields = rsaDecryptFields;
const node_rsa_1 = __importDefault(require("node-rsa"));
const logger_config_1 = require("../config/logger.config");
const PRIVATE_KEY = process.env.RSA_PRIVATE_KEY;
function loadKeyPair() {
    if (!PRIVATE_KEY) {
        throw new Error("RSA_PRIVATE_KEY missing in environment");
    }
    const key = new node_rsa_1.default(PRIVATE_KEY);
    key.setOptions({
        encryptionScheme: {
            scheme: "pkcs1_oaep",
            hash: "sha1",
        },
    });
    return key;
}
function rsaEncrypt(data) {
    try {
        return loadKeyPair().encrypt(data, "base64"); // uses PUBLIC part automatically ✅
    }
    catch (err) {
        logger_config_1.logger.error("Encryption failed:", err);
        throw new Error("Failed to encrypt");
    }
}
function rsaDecrypt(encrypted) {
    const key = new node_rsa_1.default(PRIVATE_KEY);
    key.setOptions({
        encryptionScheme: {
            scheme: "pkcs1_oaep",
            hash: "sha1",
        },
    });
    try {
        return key.decrypt(encrypted, "utf8"); // uses PRIVATE part automatically ✅
    }
    catch (err) {
        logger_config_1.logger.error("Decryption failed:", err);
        throw new Error("Failed to decrypt (key mismatch or corrupted data)");
    }
}
function rsaEncryptFields(data, fields) {
    const newObj = Object.assign({}, data);
    fields.forEach((field) => {
        if (typeof newObj[field] === "string") {
            newObj[field] = rsaEncrypt(newObj[field]);
        }
    });
    return newObj;
}
function rsaDecryptFields(data, fields) {
    const newObj = Object.assign({}, data);
    fields.forEach((field) => {
        if (typeof newObj[field] === "string") {
            newObj[field] = rsaDecrypt(newObj[field]);
        }
    });
    return newObj;
}
