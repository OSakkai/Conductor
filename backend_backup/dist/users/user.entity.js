"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserStatus = exports.UserPermission = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
var UserRole;
(function (UserRole) {
    UserRole["ESTAGIARIO"] = "Estagiario";
    UserRole["GESTOR"] = "Gestor";
    UserRole["ANALISTA"] = "Analista";
    UserRole["COORDENADOR"] = "Coordenador";
    UserRole["DIRETOR"] = "Diretor";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserPermission;
(function (UserPermission) {
    UserPermission["VISITANTE"] = "Visitante";
    UserPermission["USUARIO"] = "Usuario";
    UserPermission["OPERADOR"] = "Operador";
    UserPermission["ADMINISTRADOR"] = "Administrador";
    UserPermission["DESENVOLVEDOR"] = "Desenvolvedor";
})(UserPermission || (exports.UserPermission = UserPermission = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ATIVO"] = "Ativo";
    UserStatus["INATIVO"] = "Inativo";
    UserStatus["BLOQUEADO"] = "Bloqueado";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
let User = exports.User = class User {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50 }),
    __metadata("design:type", String)
], User.prototype, "nome_usuario", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserRole,
    }),
    __metadata("design:type", String)
], User.prototype, "funcao", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserPermission,
        default: UserPermission.VISITANTE,
    }),
    __metadata("design:type", String)
], User.prototype, "permissao", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 20 }),
    __metadata("design:type", String)
], User.prototype, "celular", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], User.prototype, "senha", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ATIVO,
    }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "data_criacao", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "data_atualizacao", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "ultimo_login", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], User.prototype, "token_recuperacao", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "token_expiracao", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('usuarios')
], User);
//# sourceMappingURL=user.entity.js.map