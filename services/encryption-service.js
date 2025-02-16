class EncryptionService {

    encoder = new TextEncoder();

    async hashPasswordWithSalt(password, salt) {
        const concatenated = password + salt;
        const data = encoder.encode(concatenated);
        const hash = await window.crypto.subtle.digest("SHA-512", data);
        return hash;
    }
    
}

module.exports = new EncryptionService();