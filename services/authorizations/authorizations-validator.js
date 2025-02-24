class AuthorizationsValidator {
    async validate(...authorizationCommands) {
        for(const authCommand of authorizationCommands) {
            await authCommand.authorize();
        }
    }
}

module.exports = AuthorizationsValidator;