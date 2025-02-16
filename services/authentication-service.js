const encryptionService = require("./encryption-service");
const userService = require("./user-service");


class AuthenticationService {
    
    async isLoggedIn(login, password) {
        const user = await userService.getUserByLogin(login);

        if(!user) {
            return false;
        }

        const passwordHashed = encryptionService.hashPasswordWithSalt(password, user.password_salt);

        return passwordHashed === user.password_hash;
    }
}