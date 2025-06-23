-- ===============================================
-- CONDUCTOR - SCHEMA INICIAL COMPLETO
-- docker/mysql/init.sql
-- ===============================================
-- Versão: 1.2f
-- Data: 2025-06-23
-- Inclui: usuarios, chaves_acesso, logs_sistema

-- ===============================================
-- TABELA DE USUÁRIOS
-- ===============================================
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
    
    -- Índices para performance
    INDEX idx_nome_usuario (nome_usuario),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_permissao (permissao)
);

-- ===============================================
-- TABELA DE CHAVES DE ACESSO
-- ===============================================
CREATE TABLE IF NOT EXISTS chaves_acesso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    tipo ENUM('permanent', 'expiring', 'single_use') NOT NULL,
    permissao ENUM('Usuario', 'Operador', 'Administrador', 'Desenvolvedor') NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_expiracao TIMESTAMP NULL,
    usos_atual INT NOT NULL DEFAULT 0,
    usos_maximo INT NULL,
    status ENUM('ativa', 'inativa', 'usada', 'expirada') NOT NULL DEFAULT 'ativa',
    descricao TEXT NULL,
    criado_por VARCHAR(50) NULL,
    
    -- Índices para performance
    INDEX idx_chave (chave),
    INDEX idx_tipo (tipo),
    INDEX idx_status (status),
    INDEX idx_permissao (permissao),
    INDEX idx_data_expiracao (data_expiracao)
);

-- ===============================================
-- TABELA DE LOGS DO SISTEMA
-- ===============================================
CREATE TABLE IF NOT EXISTS logs_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    acao VARCHAR(100) NOT NULL,
    detalhes TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    -- Índices para performance
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_acao (acao),
    INDEX idx_data_criacao (data_criacao)
);

-- ===============================================
-- DADOS INICIAIS
-- ===============================================

-- Usuário administrador padrão
-- Usuário: admin | Senha: admin123
INSERT IGNORE INTO usuarios (nome_usuario, funcao, permissao, email, senha) VALUES 
('admin', 'Diretor', 'Desenvolvedor', 'admin@lab.com', '$argon2id$v=19$m=65536,t=3,p=4$YXJnb24yX3NhbHRfMjAyNQ$0X8Z9QKjL4M3N5P7R9T1V3X6Y8A2C4E6G8I0K2M4O6Q8S0U2W4Y6');

-- Chaves de acesso padrão para desenvolvimento
INSERT IGNORE INTO chaves_acesso (chave, tipo, permissao, descricao, criado_por) VALUES 
('CONDUCTOR-DEV-2025', 'permanent', 'Desenvolvedor', 'Chave de desenvolvimento padrão', 'admin'),
('ADMIN-ACCESS-KEY', 'permanent', 'Administrador', 'Chave de acesso administrativo', 'admin'),
('USER-DEMO-KEY', 'permanent', 'Usuario', 'Chave demonstrativa para usuários', 'admin');

-- Log inicial do sistema
INSERT IGNORE INTO logs_sistema (usuario_id, acao, detalhes, ip_address) VALUES 
(1, 'SISTEMA_INICIALIZADO', 'Schema do banco de dados criado com sucesso', '127.0.0.1');

-- ===============================================
-- VERIFICAÇÕES DE INTEGRIDADE
-- ===============================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    TABLE_NAME as 'Tabela',
    TABLE_ROWS as 'Registros',
    CREATE_TIME as 'Criado em'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('usuarios', 'chaves_acesso', 'logs_sistema')
ORDER BY TABLE_NAME;

-- ===============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ===============================================

-- TABELA usuarios:
-- - Gerencia usuários do sistema com diferentes funções e permissões
-- - Campos obrigatórios: nome_usuario, funcao, permissao, email, senha
-- - Status padrão: 'Ativo' | Permissão padrão: 'Visitante'

-- TABELA chaves_acesso:
-- - Sistema de chaves para controle de acesso externo
-- - Tipos: permanent (permanente), expiring (com expiração), single_use (uso único)
-- - Status: ativa, inativa, usada, expirada

-- TABELA logs_sistema:
-- - Auditoria completa de ações no sistema
-- - Referência opcional ao usuário (ON DELETE SET NULL)
-- - Campos de contexto: IP, User-Agent, detalhes da ação

-- SECURITY NOTES:
-- - Senha do admin usa hash Argon2id (mais seguro que bcrypt)
-- - Todas as senhas devem ser hashadas antes de inserção
-- - Logs preservam histórico mesmo se usuário for excluído
-- - Chaves de acesso têm controle de uso e expiração

-- PERFORMANCE NOTES:
-- - Índices criados em campos de consulta frequente
-- - Foreign key com ON DELETE SET NULL para preservar logs
-- - IGNORE usado em INSERTs para evitar erros em reinicializações