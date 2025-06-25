class LoginManager {
    constructor() {
        this.api = window.conductorAPI;
        this.authManager = window.authManager;
        this.currentMode = 'login';
        this.attemptCount = 0;
        this.lastAttempt = 0;
        this.rateLimitDelay = 30000;
        
        console.log('🔐 LoginManager inicializado');
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.toggleMode('login');
        console.log('✅ LoginManager pronto');
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

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

        this.setupRealTimeValidation();
        
        console.log('✅ Event listeners configurados');
    }

    setupRealTimeValidation() {
        const accessKey = document.getElementById('regAccessKey');
        if (accessKey) {
            accessKey.addEventListener('input', (e) => this.validateAccessKey(e));
        }

        const regEmail = document.getElementById('regEmail');
        if (regEmail) {
            regEmail.addEventListener('blur', (e) => this.validateEmail(e));
        }

        const regUsername = document.getElementById('regUsername');
        if (regUsername) {
            regUsername.addEventListener('blur', (e) => this.validateUsername(e));
        }

        const regPassword = document.getElementById('regPassword');
        if (regPassword) {
            regPassword.addEventListener('input', (e) => this.validatePassword(e));
        }

        const regConfirmPassword = document.getElementById('regConfirmPassword');
        if (regConfirmPassword) {
            regConfirmPassword.addEventListener('input', (e) => this.validateConfirmPassword(e));
        }
    }

    async validateAccessKey(event) {
        const input = event.target;
        const key = input.value ? input.value.trim() : '';
        
        if (!key) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        try {
            this.setInputStatus(input, 'loading');
            
            if (!this.api || typeof this.api.validateKey !== 'function') {
                this.setInputStatus(input, 'error', 'Serviço indisponível');
                return;
            }

            const response = await this.api.validateKey(key);
            
            if (response.success && response.isValid) {
                this.setInputStatus(input, 'success', `Chave válida - Permissão: ${response.permission || 'Usuario'}`);
            } else {
                this.setInputStatus(input, 'error', response.message || 'Chave inválida');
            }
        } catch (error) {
            this.setInputStatus(input, 'error', 'Erro ao validar chave');
        }
    }

    setInputStatus(input, status, message = '') {
        if (!input || !input.classList) return;

        input.classList.remove('is-valid', 'is-invalid', 'is-loading');
        
        let feedback = input.parentNode ? input.parentNode.querySelector('.invalid-feedback, .valid-feedback') : null;
        if (!feedback && input.parentNode) {
            feedback = document.createElement('div');
            input.parentNode.appendChild(feedback);
        }
        
        if (!feedback) return;
        
        switch (status) {
            case 'success':
                input.classList.add('is-valid');
                feedback.className = 'valid-feedback';
                feedback.textContent = message || 'Válido';
                feedback.style.display = 'block';
                break;
                
            case 'error':
                input.classList.add('is-invalid');
                feedback.className = 'invalid-feedback';
                feedback.textContent = message || 'Inválido';
                feedback.style.display = 'block';
                break;
                
            case 'loading':
                input.classList.add('is-loading');
                feedback.className = 'text-info';
                feedback.textContent = 'Validando...';
                feedback.style.display = 'block';
                break;
                
            case 'neutral':
            default:
                feedback.style.display = 'none';
                break;
        }
    }

    async checkAuth() {
        try {
            if (this.authManager.isAuthenticated()) {
                const user = this.authManager.getCurrentUser();
                if (user) {
                    console.log('✅ Usuário já autenticado, redirecionando...');
                    this.redirectToDashboard();
                    return;
                }
            }
        } catch (error) {
            console.log('🔄 Token inválido, permanecendo no login');
            this.authManager.logout();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        try {
            if (!this.checkRateLimit()) {
                this.showMessage('loginMessage', 'Muitas tentativas. Aguarde alguns minutos.', 'error');
                return;
            }

            const form = event.target;
            const formData = new FormData(form);
            
            this.setFormLoading('loginForm', true);
            this.clearMessage('loginMessage');

            const credentials = {
                username: formData.get('username')?.trim(),
                password: formData.get('password')
            };

            const validationError = this.validateLoginCredentials(credentials);
            if (validationError) {
                throw new Error(validationError);
            }

            console.log('🔐 Tentando login para:', credentials.username);

            const response = await this.api.login(credentials);
            
            if (response && response.success) {
                this.showMessage('loginMessage', 'Login realizado com sucesso!', 'success');
                this.resetRateLimit();
                
                setTimeout(() => this.redirectToDashboard(), 1000);
                
            } else {
                throw new Error(response.message || 'Falha no login');
            }
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            this.recordFailedAttempt();
            
            const userMessage = this.getUserFriendlyError(error.message);
            this.showMessage('loginMessage', userMessage, 'error');
            
        } finally {
            this.setFormLoading('loginForm', false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            this.setFormLoading('registerForm', true);
            this.clearMessage('registerMessage');

            const userData = {
                nome_usuario: formData.get('username')?.trim(),
                email: formData.get('email')?.trim(),
                celular: formData.get('phone')?.trim(),
                funcao: formData.get('role'),
                senha: formData.get('password'),
                chave_acesso: formData.get('accessKey')?.trim()
            };

            if (userData.chave_acesso && userData.chave_acesso.trim()) {
                this.showMessage('registerMessage', 'Validando chave de acesso...', 'info');
                
                const chaveValidation = await this.api.validateKey(userData.chave_acesso.trim());
                
                if (!chaveValidation.success || !chaveValidation.isValid) {
                    this.showMessage('registerMessage', `Chave inválida: ${chaveValidation.message}`, 'error');
                    return;
                }
                
                this.showMessage('registerMessage', `Chave válida! Permissão: ${chaveValidation.permission}`, 'success');
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const validationError = this.validateRegistrationData(userData, formData.get('confirmPassword'));
            if (validationError) {
                throw new Error(validationError);
            }

            console.log('📝 Tentando registro para:', userData.nome_usuario);

            const response = await this.api.register(userData);
            
            if (response && response.success) {
                this.showMessage('registerMessage', 'Usuário registrado com sucesso! Faça login para continuar.', 'success');
                
                form.reset();
                
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

    validateRegistrationData(userData, confirmPassword) {
        if (!userData.nome_usuario) {
            return 'Nome de usuário é obrigatório';
        }
        if (userData.nome_usuario.length < 3) {
            return 'Nome de usuário deve ter pelo menos 3 caracteres';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(userData.nome_usuario)) {
            return 'Nome de usuário pode conter apenas letras, números e underscore';
        }

        if (!userData.email) {
            return 'Email é obrigatório';
        }
        if (!this.isValidEmail(userData.email)) {
            return 'Email inválido';
        }

        if (!userData.funcao) {
            return 'Função é obrigatória';
        }

        if (!userData.senha) {
            return 'Senha é obrigatória';
        }

        if (userData.senha !== confirmPassword) {
            return 'Senhas não coincidem';
        }

        if (userData.celular && !this.isValidPhone(userData.celular)) {
            return 'Celular inválido';
        }

        return null;
    }

    validateLoginCredentials(credentials) {
        if (!credentials.username) {
            return 'Nome de usuário é obrigatório';
        }
        if (!credentials.password) {
            return 'Senha é obrigatória';
        }
        return null;
    }

    checkRateLimit() {
        const now = Date.now();
        
        if (this.attemptCount >= 3 && (now - this.lastAttempt) < this.rateLimitDelay) {
            return false;
        }
        
        if ((now - this.lastAttempt) > this.rateLimitDelay) {
            this.attemptCount = 0;
        }
        
        return true;
    }

    recordFailedAttempt() {
        this.attemptCount++;
        this.lastAttempt = Date.now();
    }

    resetRateLimit() {
        this.attemptCount = 0;
        this.lastAttempt = 0;
    }

    getUserFriendlyError(error) {
        const errorMessages = {
            'Credenciais inválidas': 'Usuário ou senha incorretos. Verifique os dados e tente novamente.',
            'Token inválido': 'Sessão expirada. Faça login novamente.',
            'Usuário inativo': 'Conta desativada. Entre em contato com o administrador.',
            'Usuário não encontrado': 'Usuário não existe no sistema',
            'Muitas tentativas': 'Muitas tentativas de login. Tente novamente em alguns minutos.',
            'Erro de conexão': 'Problema de conexão. Verifique sua internet e tente novamente.',
        };

        return errorMessages[error] || 'Erro no login. Verifique seus dados e tente novamente.';
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 15;
    }

    toggleMode(mode) {
        this.currentMode = mode;
        
        const loginSection = document.getElementById('loginSection');
        const registerSection = document.getElementById('registerSection');
        
        if (mode === 'login') {
            if (loginSection) loginSection.style.display = 'block';
            if (registerSection) registerSection.style.display = 'none';
            this.clearMessage('registerMessage');
        } else {
            if (loginSection) loginSection.style.display = 'none';
            if (registerSection) registerSection.style.display = 'block';
            this.clearMessage('loginMessage');
        }
        
        console.log('🔄 Modo alterado para:', mode);
    }

    setFormLoading(formId, loading) {
        const form = document.getElementById(formId);
        if (!form) return;

        const inputs = form.querySelectorAll('input, button, select');
        const submitButton = form.querySelector('button[type="submit"]');

        inputs.forEach(input => {
            input.disabled = loading;
        });

        if (submitButton) {
            if (loading) {
                submitButton.classList.add('loading');
                const originalText = submitButton.dataset.originalText || submitButton.textContent;
                submitButton.dataset.originalText = originalText;
                submitButton.textContent = 'Processando...';
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

        if (password.length < 6) {
            this.setInputStatus(input, 'error', 'Mínimo 6 caracteres');
        } else {
            this.setInputStatus(input, 'success');
        }
    }

    validateConfirmPassword(event) {
        const input = event.target;
        const confirmPassword = input.value;
        const password = document.getElementById('regPassword')?.value;
        
        if (!confirmPassword) {
            this.setInputStatus(input, 'neutral');
            return;
        }

        if (confirmPassword !== password) {
            this.setInputStatus(input, 'error', 'Senhas não coincidem');
        } else {
            this.setInputStatus(input, 'success');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
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