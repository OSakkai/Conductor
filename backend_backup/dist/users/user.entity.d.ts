export declare enum UserRole {
    ESTAGIARIO = "Estagiario",
    GESTOR = "Gestor",
    ANALISTA = "Analista",
    COORDENADOR = "Coordenador",
    DIRETOR = "Diretor"
}
export declare enum UserPermission {
    VISITANTE = "Visitante",
    USUARIO = "Usuario",
    OPERADOR = "Operador",
    ADMINISTRADOR = "Administrador",
    DESENVOLVEDOR = "Desenvolvedor"
}
export declare enum UserStatus {
    ATIVO = "Ativo",
    INATIVO = "Inativo",
    BLOQUEADO = "Bloqueado"
}
export declare class User {
    id: number;
    nome_usuario: string;
    funcao: UserRole;
    permissao: UserPermission;
    email: string;
    celular: string;
    senha: string;
    status: UserStatus;
    data_criacao: Date;
    data_atualizacao: Date;
    ultimo_login: Date;
    token_recuperacao: string;
    token_expiracao: Date;
}
