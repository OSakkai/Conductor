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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const bcrypt = require("bcrypt");
let UsersService = exports.UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async findAll() {
        return this.usersRepository.find({
            select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
        });
    }
    async findByUsername(nome_usuario) {
        return this.usersRepository.findOne({
            where: { nome_usuario },
        });
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({
            where: { email },
        });
    }
    async findById(id) {
        return this.usersRepository.findOne({
            where: { id },
            select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
        });
    }
    async create(userData) {
        const existingUser = await this.findByUsername(userData.nome_usuario);
        if (existingUser) {
            throw new common_1.ConflictException('Nome de usuário já existe');
        }
        const existingEmail = await this.findByEmail(userData.email);
        if (existingEmail) {
            throw new common_1.ConflictException('Email já está em uso');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.senha, saltRounds);
        const user = this.usersRepository.create({
            ...userData,
            senha: hashedPassword,
        });
        const savedUser = await this.usersRepository.save(user);
        const { senha, ...result } = savedUser;
        return result;
    }
    async updateLastLogin(userId) {
        await this.usersRepository.update(userId, {
            ultimo_login: new Date(),
        });
    }
    async updateUser(id, updateData) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        if (updateData.senha) {
            const saltRounds = 10;
            updateData.senha = await bcrypt.hash(updateData.senha, saltRounds);
        }
        await this.usersRepository.update(id, updateData);
        return this.findById(id);
    }
    async deactivateUser(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        await this.usersRepository.update(id, {
            status: user_entity_1.UserStatus.INATIVO,
        });
    }
};
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map