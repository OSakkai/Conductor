// ===============================================
// CONDUCTOR - LOGIN MANAGER COMPLETO E CORRIGIDO
// frontend/js/pages/login.js
// TODAS AS 4 FASES IMPLEMENTADAS
// SOLUÇÕES DO DOC III APLICADAS
// ===============================================

class LoginManager {
    constructor() {
        // Verificar dependências críticas
        if (!window.conductorAPI) {
            console.error('❌ ConductorAPI não encontrado!');
            return;
        }
        
        if (!window.authManager) {
            console.error('❌ AuthManager não encontrado!');
            return;
        }

        this.api = window.conductorAPI;
        this.authManager = window.authManager;
        
        // Estado do formulário
        this.isLoading = false;
        this.currentMode = 'login'; // 'login' ou 'register'
        this.lastAttemptTime = 0;
        this.attemptCount = 0;
        
        console.log('✅ LoginManager inicializado');
    }

    // ===============================================
    // INICIALIZAÇÃO - FASE 1
    // ===============================================

    async init() {
        console.log('🔄 Inicializando sistema de login...');
        
        try {
            // Verificar se já está autenticado
            await this.checkAuth();
            
            // Setup dos event listeners
            this.setupEventListeners();
            
            // ✅ FASE 4: Setup de validações
            this.setupValidations();
            
            // ✅ FASE 3: Setup de rate limiting client-side
            this.setupRateLimiting();
            
            console.log('✅ Sistema de login inicializado');
            
        } catch (error) {
            console.error('❌ Erro na inicialização do login:', error);
        }
    }

    // ===============================================
    // EVENT LISTENERS - FASE 1 & 4
    // ===============================================

    setupEventListeners() {
        // ✅ CORREÇÃO do Doc III: Sempre verificar se preventDefault() está no início
        // Lição: "Sempre verificar se preventDefault() está no início das funções de submit"
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Toggle entre login e registro
        const showRegister = document.getElementById('showRegister');
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMode('register');
            });
        }

        const showLogin = document.getElementById('showLogin');
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMode('login');
            });
        }

        // ✅ FASE 4: Validações em tempo real
        this.setupRealTimeValidation();
        
        console.log('✅ Event listeners configurados');
    }

    // ✅ FASE 4: Validações em tempo real
    setupRealTimeValidation() {
        // Validação de chave de acesso
        const accessKey = document.getElementById('regAccessKey');
        if (accessKey) {
            accessKey.addEventListener('input', (e) => this.validateAccessKey(e));
        }

        // Email validation
        const regEmail = document.getElementById('regEmail');
        if (regEmail) {
            regEmail.addEventListener('blur', (e) => this.validateEmail(e));
        }

        // Username validation
        const regUsername = document.getElementById('regUsername');
        if (regUsername) {
            regUsername.addEventListener('blur', (e) => this.validateUsername(e));
        }

        // Password validation
        const regPassword = document.getElementById('regPassword');
        if (regPassword) {
            regPassword.addEventListener('input', (e) => this.validatePassword(e));
        }

        // Confirm password validation
        const regConfirmPassword = document.getElementById('regConfirmPassword');
        if (regConfirmPassword) {
            regConfirmPassword.addEventListener('input', (e) => this.validateConfirmPassword(e));
        }
    }

    // ===============================================
    // VERIFICAÇÃO DE AUTENTICAÇÃO - FASE 1
    // ===============================================

    async checkAuth() {
        try {
            if (this.authManager.isAuthenticated()) {
                // ✅ CORREÇÃO do Doc III: Não fazer validação automática que causa loops
                // Lição: "Validação de token deve ser opcional, não automática na proteção de páginas"
                
                const user = this.authManager.getCurrentUser();
                if (user) {
                    console.log('✅ Usuário já autenticado, redirecionando...');
                    this.redirectToDashboard();
                    return;
                }
            }
        } catch (error) {
            // Token inválido, limpar
            console.log('🔄 Token inválido, permanecendo no login');
            this.authManager.logout();
        }
    }

    // ===============================================
    // HANDLE LOGIN - FASE 1 & 3
    // ===============================================

    async handleLogin(event) {
        // ✅ CORREÇÃO CRÍTICA do Doc III: preventDefault no início
        event.preventDefault();
        
        try {
            // ✅ FASE 3: Verificar rate limiting
            if (!this.checkRateLimit()) {
                this.showMessage('loginMessage', 'Muitas tentativas. Aguarde alguns minutos.', 'error');
                return;
            }

            const form = event.target;
            const formData = new FormData(form);
            
            // Desabilitar formulário
            this.setFormLoading('loginForm', true);
            this.clearMessage('loginMessage');

            const credentials = {
                username: formData.get('username')?.trim(),
                password: formData.get('password')
            };

            // ✅ FASE 4: Validações melhoradas
            const validationError = this.validateLoginCredentials(credentials);
            if (validationError) {
                throw new Error(validationError);
            }

            console.log('🔐 Tentando login para:', credentials.username);

            // Fazer login via API
            const response = await this.api.login(credentials);
            
            if (response && response.success) {
                this.showMessage('loginMessage', 'Login realizado com sucesso!', 'success');
                
                // ✅ FASE 1: Atualizar AuthManager
                this.authManager.currentUser = response.user;
                
                // Reset rate limiting em sucesso
                this.resetRateLimit();
                
                // Aguardar um momento antes de redirecionar
                setTimeout(() => this.redirectToDashboard(), 1000);
                
            } else {
                throw new Error(response.message || 'Falha no login');
            }
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            
            // ✅ FASE 3: Registrar tentativa falhada
            this.recordFailedAttempt();
            
            // ✅ FASE 4: Mostrar mensagem específica
            const errorMessage = this.getLoginErrorMessage(error.message);
            this.showMessage('loginMessage', errorMessage, 'error');
            
        } finally {
            this.setFormLoading('loginForm', false);
        }
    }

    // ✅ FASE 4: Validação de credenciais de login
    validateLoginCredentials(credentials) {
        if (!credentials.username) {
            return 'Por favor, insira seu nome de usuário';
        }
        
        if (!credentials.password) {
            return 'Por favor, insira sua senha';
        }
        
        if (credentials.username.length < 3) {
            return 'Nome de usuário deve ter pelo menos 3 caracteres';
        }
        
        // ✅ CORREÇÃO: Removida validação de 6 caracteres mínimos na senha
        // A validação de senha será feita apenas no backend
        
        return null;
    }

    // ✅ FASE 4: Mensagens de erro específicas
    getLoginErrorMessage(error) {
        const errorMessages = {
            'Credenciais inválidas': 'Usuário ou senha incorretos',
            'Conta inativa ou bloqueada': 'Sua conta foi desativada. Entre em contato com o administrador.',
            'Usuário não encontrado': 'Usuário não existe no sistema',
            'Muitas tentativas': 'Muitas tentativas de login. Tente novamente em alguns minutos.',
            'Erro de conexão': 'Problema de conexão. Verifique sua internet e tente novamente.',
        };

        return errorMessages[error] || 'Erro no login. Verifique seus dados e tente novamente.';
    }

    // ===============================================
    // HANDLE REGISTER - FASE 1 & 4
    // ===============================================

    async handleRegister(event) {
        // ✅ CORREÇÃO CRÍTICA do Doc III: preventDefault no início
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // Desabilitar formulário
            this.setFormLoading('registerForm', true);
            this.clearMessage('registerMessage');

            // ✅ FASE 2: Coletar dados usando campos corretos do backend
            const userData = {
                nome_usuario: formData.get('username')?.trim(), // ✅ nome_usuario
                email: formData.get('email')?.trim(),
                celular: formData.get('phone')?.trim(), // ✅ celular
                funcao: formData.get('role'),
                senha: formData.get('password'),
                chave_acesso: formData.get('accessKey')?.trim()
            };

            // ✅ FASE 4: Validações completas
            const validationError = this.validateRegistrationData(userData, formData.get('confirmPassword'));
            if (validationError) {
                throw new Error(validationError);
            }

            console.log('📝 Tentando registro para:', userData.nome_usuario);

            // Fazer registro via API
            const response = await this.api.register(userData);
            
            if (response && response.success) {
                this.showMessage('registerMessage', 'Usuário registrado com sucesso! Faça login para continuar.', 'success');
                
                // Limpar formulário
                form.reset();
                
                // Voltar para o modo login após 2 segundos
                setTimeout(() => this.toggleMode('login'), 2000);
                
            } else {
                throw new Error(response.message || 'Falha no registro');
            }
            
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            this.showMessage('registerMessage', error.message, 'error');
            
        } finally {
            this.setFormLoading('registerForm', false);
        }
    }

    // ✅ FASE 4: Validação completa de dados de registro
    validateRegistrationData(userData, confirmPassword) {
        // Validar nome de usuário
        if (!userData.nome_usuario) {
            return 'Nome de usuário é obrigatório';
        }
        if (userData.nome_usuario.length < 3) {
            return 'Nome de usuário deve ter pelo menos 3 caracteres';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(userData.nome_usuario)) {
            return 'Nome de usuário pode conter apenas letras, números e underscore';
        }

        // Validar email
        if (!userData.email) {
            return 'Email é obrigatório';
        }
        if (!this.isValidEmail(userData.email)) {
            return 'Email inválido';
        }

        // Validar função
        if (!userData.funcao) {
            return 'Função é obrigatória';
        }

        // Validar senha
        if (!userData.senha) {
            return 'Senha é obrigatória';
        }
        // ✅ CORREÇÃO: Removida validação de 6 caracteres mínimos
        // Validação será feita apenas no backend

        // Validar confirmação de senha
        if (userData.senha !== confirmPassword) {
            return 'Senhas não coincidem';
        }

        // Validar celular se fornecido
        if (userData.celular && !this.isValidPhone(userData.celular)) {
            return 'Celular inválido';
        }

        return null;
    }

    // ===============================================
    // VALIDAÇÕES INDIVIDUAIS - FASE 4
    // ===============================================

    async validateAccessKey(event) {
        const input = event.target;
        const key = input.value.trim();
        
        if (!key) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        try {
            this.setInputStatus(input, 'loading');
            
            const response = await this.api.validateKey(key);
            
            if (response && response.success) {
                this.setInputStatus(input, 'success', 'Chave válida');
            } else {
                this.setInputStatus(input, 'error', 'Chave inválida');
            }
        } catch (error) {
            this.setInputStatus(input, 'error', 'Erro ao validar chave');
        }
    }

    validateEmail(event) {
        const input = event.target;
        const email = input.value.trim();
        
        if (!email) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        if (this.isValidEmail(email)) {
            this.setInputStatus(input, 'success');
        } else {
            this.setInputStatus(input, 'error', 'Email inválido');
        }
    }

    validateUsername(event) {
        const input = event.target;
        const username = input.value.trim();
        
        if (!username) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        if (username.length < 3) {
            this.setInputStatus(input, 'error', 'Mínimo 3 caracteres');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.setInputStatus(input, 'error', 'Apenas letras, números e _');
        } else {
            this.setInputStatus(input, 'success');
        }
    }

    validatePassword(event) {
        const input = event.target;
        const password = input.value;
        
        if (!password) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        // ✅ CORREÇÃO: Removida validação de 6 caracteres mínimos
        // Validação será feita apenas no backend
        this.setInputStatus(input, 'success');
        
        // Validar confirmação se já preenchida
        const confirmInput = document.getElementById('regConfirmPassword');
        if (confirmInput && confirmInput.value) {
            this.validateConfirmPassword({ target: confirmInput });
        }
    }

    validateConfirmPassword(event) {
        const input = event.target;
        const confirmPassword = input.value;
        const passwordInput = document.getElementById('regPassword');
        
        if (!confirmPassword) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        if (!passwordInput) {
            this.setInputStatus(input, 'error', 'Campo senha não encontrado');
            return;
        }

        if (confirmPassword === passwordInput.value) {
            this.setInputStatus(input, 'success');
        } else {
            this.setInputStatus(input, 'error', 'Senhas não coincidem');
        }
    }

    // ===============================================
    // UTILITÁRIOS DE VALIDAÇÃO - FASE 4
    // ===============================================

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Aceitar formatos brasileiros básicos
        const phoneRegex = /^[\(\)0-9\-\+\s]+$/;
        const cleaned = phone.replace(/\D/g, '');
        return phoneRegex.test(phone) && cleaned.length >= 10 && cleaned.length <= 11;
    }

    setInputStatus(input, status, message = '') {
        // Remover classes de status anteriores
        input.classList.remove('input-success', 'input-error', 'input-loading');
        
        // Adicionar nova classe
        if (status !== 'neutral') {
            input.classList.add(`input-${status}`);
        }

        // Atualizar mensagem de feedback
        const feedbackId = input.id + 'Feedback';
        let feedback = document.getElementById(feedbackId);
        
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = feedbackId;
            feedback.className = 'input-feedback';
            input.parentNode.appendChild(feedback);
        }

        feedback.textContent = message;
        feedback.className = `input-feedback ${status}`;
    }

    // ===============================================
    // RATE LIMITING CLIENT-SIDE - FASE 3
    // ===============================================

    setupRateLimiting() {
        this.maxAttempts = 5;
        this.lockoutTime = 5 * 60 * 1000; // 5 minutos
        this.attemptWindow = 60 * 1000; // 1 minuto
    }

    checkRateLimit() {
        const now = Date.now();
        
        // Limpar tentativas antigas
        if (now - this.lastAttemptTime > this.attemptWindow) {
            this.attemptCount = 0;
        }

        return this.attemptCount < this.maxAttempts;
    }

    recordFailedAttempt() {
        this.attemptCount++;
        this.lastAttemptTime = Date.now();
        
        console.log(`⚠️ Tentativa falhada ${this.attemptCount}/${this.maxAttempts}`);
    }

    resetRateLimit() {
        this.attemptCount = 0;
        this.lastAttemptTime = 0;
    }

    // ===============================================
    // INTERFACE E UTILITÁRIOS - FASE 1 & 4
    // ===============================================

    toggleMode(mode) {
        this.currentMode = mode;
        
        const loginSection = document.getElementById('loginSection');
        const registerSection = document.getElementById('registerSection');
        
        if (mode === 'login') {
            if (loginSection) loginSection.style.display = 'block';
            if (registerSection) registerSection.style.display = 'none';
        } else {
            if (loginSection) loginSection.style.display = 'none';
            if (registerSection) registerSection.style.display = 'block';
        }

        // Limpar mensagens
        this.clearMessage('loginMessage');
        this.clearMessage('registerMessage');
        
        console.log(`🔄 Modo alterado para: ${mode}`);
    }

    setFormLoading(formId, loading) {
        const form = document.getElementById(formId);
        if (!form) return;

        this.isLoading = loading;
        
        const submitButton = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, select, button');
        
        inputs.forEach(input => {
            input.disabled = loading;
        });
        
        if (submitButton) {
            if (loading) {
                submitButton.textContent = 'Carregando...';
                submitButton.classList.add('loading');
            } else {
                const originalText = formId === 'loginForm' ? 'Entrar' : 'Cadastrar';
                submitButton.textContent = originalText;
                submitButton.classList.remove('loading');
            }
        }
    }

    showMessage(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        
        // ✅ FASE 4: Auto-hide para mensagens de sucesso
        if (type === 'success') {
            setTimeout(() => this.clearMessage(elementId), 5000);
        }
    }

    clearMessage(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
            element.className = 'message';
        }
    }

    redirectToDashboard() {
        console.log('🏠 Redirecionando para dashboard...');
        window.location.href = 'dashboard.html';
    }

    // ===============================================
    // SETUP INICIAL - FASE 4
    // ===============================================

    setupValidations() {
        // ✅ CORREÇÃO CRÍTICA: CSS removido - deve ficar separado conforme arquitetura
        // CSS para validações deve ser adicionado em /css/pages/login.css
        console.log('⚠️ Estilos de validação devem ser implementados em /css/pages/login.css');
        console.log('   Classes necessárias: .input-success, .input-error, .input-loading, .input-feedback');
    }
}

// ===============================================
// INSTÂNCIA GLOBAL E INICIALIZAÇÃO
// ===============================================

// Aguardar DOM e dependências estarem prontas
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar um frame para garantir que todas as dependências estejam carregadas
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    if (window.conductorAPI && window.authManager) {
        window.loginManager = new LoginManager();
        await window.loginManager.init();
        console.log('✅ LoginManager inicializado e pronto');
    } else {
        console.error('❌ Dependências não disponíveis para LoginManager');
    }
});

console.log('🔐 LOGIN MANAGER COMPLETO carregado!');