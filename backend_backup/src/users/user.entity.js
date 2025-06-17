"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserStatus = exports.UserPermission = exports.UserRole = void 0;
var typeorm_1 = require("typeorm");
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
var User = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('usuarios')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _nome_usuario_decorators;
    var _nome_usuario_initializers = [];
    var _nome_usuario_extraInitializers = [];
    var _funcao_decorators;
    var _funcao_initializers = [];
    var _funcao_extraInitializers = [];
    var _permissao_decorators;
    var _permissao_initializers = [];
    var _permissao_extraInitializers = [];
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _celular_decorators;
    var _celular_initializers = [];
    var _celular_extraInitializers = [];
    var _senha_decorators;
    var _senha_initializers = [];
    var _senha_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _data_criacao_decorators;
    var _data_criacao_initializers = [];
    var _data_criacao_extraInitializers = [];
    var _data_atualizacao_decorators;
    var _data_atualizacao_initializers = [];
    var _data_atualizacao_extraInitializers = [];
    var _ultimo_login_decorators;
    var _ultimo_login_initializers = [];
    var _ultimo_login_extraInitializers = [];
    var _token_recuperacao_decorators;
    var _token_recuperacao_initializers = [];
    var _token_recuperacao_extraInitializers = [];
    var _token_expiracao_decorators;
    var _token_expiracao_initializers = [];
    var _token_expiracao_extraInitializers = [];
    var User = _classThis = /** @class */ (function () {
        function User_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.nome_usuario = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _nome_usuario_initializers, void 0));
            this.funcao = (__runInitializers(this, _nome_usuario_extraInitializers), __runInitializers(this, _funcao_initializers, void 0));
            this.permissao = (__runInitializers(this, _funcao_extraInitializers), __runInitializers(this, _permissao_initializers, void 0));
            this.email = (__runInitializers(this, _permissao_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.celular = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _celular_initializers, void 0));
            this.senha = (__runInitializers(this, _celular_extraInitializers), __runInitializers(this, _senha_initializers, void 0));
            this.status = (__runInitializers(this, _senha_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.data_criacao = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _data_criacao_initializers, void 0));
            this.data_atualizacao = (__runInitializers(this, _data_criacao_extraInitializers), __runInitializers(this, _data_atualizacao_initializers, void 0));
            this.ultimo_login = (__runInitializers(this, _data_atualizacao_extraInitializers), __runInitializers(this, _ultimo_login_initializers, void 0));
            this.token_recuperacao = (__runInitializers(this, _ultimo_login_extraInitializers), __runInitializers(this, _token_recuperacao_initializers, void 0));
            this.token_expiracao = (__runInitializers(this, _token_recuperacao_extraInitializers), __runInitializers(this, _token_expiracao_initializers, void 0));
            __runInitializers(this, _token_expiracao_extraInitializers);
        }
        return User_1;
    }());
    __setFunctionName(_classThis, "User");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _nome_usuario_decorators = [(0, typeorm_1.Column)({ unique: true, length: 50 })];
        _funcao_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: UserRole,
            })];
        _permissao_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: UserPermission,
                default: UserPermission.VISITANTE,
            })];
        _email_decorators = [(0, typeorm_1.Column)({ unique: true, length: 100 })];
        _celular_decorators = [(0, typeorm_1.Column)({ nullable: true, length: 20 })];
        _senha_decorators = [(0, typeorm_1.Column)({ length: 255 })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: UserStatus,
                default: UserStatus.ATIVO,
            })];
        _data_criacao_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _data_atualizacao_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _ultimo_login_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _token_recuperacao_decorators = [(0, typeorm_1.Column)({ nullable: true, length: 255 })];
        _token_expiracao_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _nome_usuario_decorators, { kind: "field", name: "nome_usuario", static: false, private: false, access: { has: function (obj) { return "nome_usuario" in obj; }, get: function (obj) { return obj.nome_usuario; }, set: function (obj, value) { obj.nome_usuario = value; } }, metadata: _metadata }, _nome_usuario_initializers, _nome_usuario_extraInitializers);
        __esDecorate(null, null, _funcao_decorators, { kind: "field", name: "funcao", static: false, private: false, access: { has: function (obj) { return "funcao" in obj; }, get: function (obj) { return obj.funcao; }, set: function (obj, value) { obj.funcao = value; } }, metadata: _metadata }, _funcao_initializers, _funcao_extraInitializers);
        __esDecorate(null, null, _permissao_decorators, { kind: "field", name: "permissao", static: false, private: false, access: { has: function (obj) { return "permissao" in obj; }, get: function (obj) { return obj.permissao; }, set: function (obj, value) { obj.permissao = value; } }, metadata: _metadata }, _permissao_initializers, _permissao_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _celular_decorators, { kind: "field", name: "celular", static: false, private: false, access: { has: function (obj) { return "celular" in obj; }, get: function (obj) { return obj.celular; }, set: function (obj, value) { obj.celular = value; } }, metadata: _metadata }, _celular_initializers, _celular_extraInitializers);
        __esDecorate(null, null, _senha_decorators, { kind: "field", name: "senha", static: false, private: false, access: { has: function (obj) { return "senha" in obj; }, get: function (obj) { return obj.senha; }, set: function (obj, value) { obj.senha = value; } }, metadata: _metadata }, _senha_initializers, _senha_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _data_criacao_decorators, { kind: "field", name: "data_criacao", static: false, private: false, access: { has: function (obj) { return "data_criacao" in obj; }, get: function (obj) { return obj.data_criacao; }, set: function (obj, value) { obj.data_criacao = value; } }, metadata: _metadata }, _data_criacao_initializers, _data_criacao_extraInitializers);
        __esDecorate(null, null, _data_atualizacao_decorators, { kind: "field", name: "data_atualizacao", static: false, private: false, access: { has: function (obj) { return "data_atualizacao" in obj; }, get: function (obj) { return obj.data_atualizacao; }, set: function (obj, value) { obj.data_atualizacao = value; } }, metadata: _metadata }, _data_atualizacao_initializers, _data_atualizacao_extraInitializers);
        __esDecorate(null, null, _ultimo_login_decorators, { kind: "field", name: "ultimo_login", static: false, private: false, access: { has: function (obj) { return "ultimo_login" in obj; }, get: function (obj) { return obj.ultimo_login; }, set: function (obj, value) { obj.ultimo_login = value; } }, metadata: _metadata }, _ultimo_login_initializers, _ultimo_login_extraInitializers);
        __esDecorate(null, null, _token_recuperacao_decorators, { kind: "field", name: "token_recuperacao", static: false, private: false, access: { has: function (obj) { return "token_recuperacao" in obj; }, get: function (obj) { return obj.token_recuperacao; }, set: function (obj, value) { obj.token_recuperacao = value; } }, metadata: _metadata }, _token_recuperacao_initializers, _token_recuperacao_extraInitializers);
        __esDecorate(null, null, _token_expiracao_decorators, { kind: "field", name: "token_expiracao", static: false, private: false, access: { has: function (obj) { return "token_expiracao" in obj; }, get: function (obj) { return obj.token_expiracao; }, set: function (obj, value) { obj.token_expiracao = value; } }, metadata: _metadata }, _token_expiracao_initializers, _token_expiracao_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        User = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return User = _classThis;
}();
exports.User = User;
