-- Criação da tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_usuario VARCHAR(50) NOT NULL UNIQUE,
    funcao ENUM('Estagiario', 'Gestor', 'Analista', 'Coordenador', 'Diretor') NOT NULL,
    permissao ENUM('Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor') NOT NULL DEFAULT 'Visitante',
    email VARCHAR(100) NOT NULL UNIQUE,
    celular VARCHAR(20) NULL,
    senha VARCHAR(255) NOT NULL,
    status ENUM('Ativo', 'Inativo', 'Bloqueado') NOT NULL DEFAULT 'Ativo',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL,
    token_recuperacao VARCHAR(255) NULL,
    token_expiracao TIMESTAMP NULL,
    INDEX idx_nome_usuario (nome_usuario),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Inserir usuário administrador padrão (senha: admin123)
INSERT INTO usuarios (nome_usuario, funcao, permissao, email, senha) VALUES 
('admin', 'Diretor', 'Desenvolvedor', 'admin@lab.com', '$2b$10$rQ8K8R9.dZoYyU5Y5Y5Y5u7Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y');

-- Tabela de logs de sistema (para auditoria)
CREATE TABLE IF NOT EXISTS logs_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    acao VARCHAR(100) NOT NULL,
    detalhes TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_acao (acao),
    INDEX idx_data_criacao (data_criacao)
);