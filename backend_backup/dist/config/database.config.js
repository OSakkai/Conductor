"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const user_entity_1 = require("../users/user.entity");
exports.databaseConfig = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'lab_user',
    password: process.env.DB_PASSWORD || 'lab_password123',
    database: process.env.DB_DATABASE || 'lab_sistema',
    entities: [user_entity_1.User],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    timezone: 'Z',
};
//# sourceMappingURL=database.config.js.map