// ===============================================
// CONDUCTOR - LOGIN PAGE COMPLETO CORRIGIDO
// frontend/js/pages/login.js
// ===============================================

class LoginPage {
    constructor() {
        this.currentTab = 'login';
        this.api = window.conductorAPI;
        this.authManager = window.authManager;
        this.init();
    }

    init() {
        // Verificar dependências críticas
        if (!this.api) {
            console.error('❌ ConductorAPI não encontrado!');
            return;
        }

        if (!this.authManager) {
            console.error('❌ AuthManager não encontrado!');
            return;
        }

        // Event listeners
        this.setupEventListeners();
        
        // Verificar se já está logado
        this.checkAuth();
        
        console.log('✅ LoginPage inicializado');
    }

    setupEventListeners() {
        // Formulários
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Validação em tempo real
        const passwordConfirm = document.getElementById('regPasswordConfirm');
        const accessKey = document.getElementById('accessKey');
        const regPassword = document.getElementById('regPassword');
        
        if (passwordConfirm) {
            passwordConfirm.addEventListener('input', () => this.validatePasswordMatch());
        }
        
        if (regPassword) {
            regPassword.addEventListener('input', () => this.validatePasswordMatch());
        }
        
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
    }

    // ===============================================
    // VERIFICAÇÃO DE AUTENTICAÇÃO
    // ===============================================

    async checkAuth() {
        try {
            if (this.authManager.isAuthenticated()) {
                // Verificar se token é válido
                const user = await this.api.validateToken();
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
    // HANDLE LOGIN
    // ===============================================

    async handleLogin(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // Desabilitar formulário
            this.setFormLoading('loginForm', true);
            this.clearMessage('loginMessage');

            const credentials = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            // Validar campos
            if (!credentials.username || !credentials.password) {
                throw new Error('Por favor, preencha todos os campos');
            }

            console.log('🔐 Tentando login para:', credentials.username);

            // Fazer login via API
            const response = await this.api.login(credentials);
            
            if (response && response.access_token) {
                this.showMessage('loginMessage', 'Login realizado com sucesso! Redirecionando...', 'success');
                
                // Aguardar um momento para mostrar a mensagem
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1000);
                
            } else {
                throw new Error(response?.message || 'Credenciais inválidas');
            }

        } catch (error) {
            console.error('❌ Erro no login:', error);
            this.showMessage('loginMessage', 'Erro no login: ' + error.message, 'danger');
            this.setFormLoading('loginForm', false);
        }
    }

    // ===============================================
    // HANDLE REGISTER
    // ===============================================

    async handleRegister(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // Desabilitar formulário
            this.setFormLoading('registerForm', true);
            this.clearMessage('registerMessage');

            // ✅ CORREÇÃO: Mapear campos corretamente para backend
            const userData = {
                nome_usuario: formData.get('username'),
                email: formData.get('email'),
                senha: formData.get('password'),
                funcao: formData.get('funcao') || 'Estagiario',
                chave_acesso: formData.get('accessKey') || null
            };

            // Validar campos obrigatórios
            if (!userData.nome_usuario || !userData.email || !userData.senha) {
                throw new Error('Por favor, preencha todos os campos obrigatórios');
            }

            // Validar confirmação de senha
            const passwordConfirm = formData.get('passwordConfirm');
            if (userData.senha !== passwordConfirm) {
                throw new Error('As senhas não coincidem');
            }

            // Validar email
            if (!this.isValidEmail(userData.email)) {
                throw new Error('Email inválido');
            }

            // Validar chave de acesso se fornecida
            if (userData.chave_acesso) {
                const isKeyValid = await this.validateKeyWithBackend(userData.chave_acesso);
                if (!isKeyValid) {
                    throw new Error('Chave de acesso inválida');
                }
            }

            console.log('📝 Criando conta para:', userData.nome_usuario);

            // Fazer registro via API
            const response = await this.api.register(userData);
            
            if (response && response.message) {
                this.showMessage('registerMessage', response.message + ' Redirecionando para login...', 'success');
                
                // Limpar formulário
                form.reset();
                
                // Aguardar e redirecionar para tab de login
                setTimeout(() => {
                    this.switchToLogin();
                }, 2000);
                
            } else {
                throw new Error(response?.message || 'Erro ao criar conta');
            }

        } catch (error) {
            console.error('❌ Erro no registro:', error);
            this.showMessage('registerMessage', 'Erro no registro: ' + error.message, 'danger');
            this.setFormLoading('registerForm', false);
        }
    }

    // ===============================================
    // VALIDAÇÕES
    // ===============================================

    validatePasswordMatch() {
        const password = document.getElementById('regPassword');
        const passwordConfirm = document.getElementById('regPasswordConfirm');
        
        if (!password || !passwordConfirm) return;

        const isMatch = password.value === passwordConfirm.value;
        const hasValue = passwordConfirm.value.length > 0;

        // Remover classes anteriores
        passwordConfirm.classList.remove('is-valid', 'is-invalid');

        if (hasValue) {
            if (isMatch) {
                passwordConfirm.classList.add('is-valid');
            } else {
                passwordConfirm.classList.add('is-invalid');
            }
        }

        // Validar força da senha
        this.validatePasswordStrength(password.value);
    }

    validatePasswordStrength(password) {
        const passwordField = document.getElementById('regPassword');
        if (!passwordField || !password) return;

        // Critérios de senha forte
        const minLength = password.length >= 6;
        const hasNumber = /\d/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);

        const isStrong = minLength && hasNumber && hasLetter;

        passwordField.classList.remove('is-valid', 'is-invalid');

        if (password.length > 0) {
            if (isStrong) {
                passwordField.classList.add('is-valid');
            } else if (password.length < 6) {
                passwordField.classList.add('is-invalid');
            }
        }
    }

    async validateAccessKey(event) {
        const accessKey = event.target;
        const value = accessKey.value.trim();

        // Remover classes anteriores
        accessKey.classList.remove('is-valid', 'is-invalid');

        if (value.length === 0) {
            // Chave opcional - não mostrar erro
            return;
        }

        try {
            // Validar formato (16 caracteres alfanuméricos)
            if (!/^[A-Z0-9]{16}$/.test(value)) {
                accessKey.classList.add('is-invalid');
                return;
            }

            // Validar com backend
            const isValid = await this.validateKeyWithBackend(value);
            
            if (isValid) {
                accessKey.classList.add('is-valid');
            } else {
                accessKey.classList.add('is-invalid');
            }

        } catch (error) {
            console.error('❌ Erro ao validar chave:', error);
            accessKey.classList.add('is-invalid');
        }
    }

    async validateKeyWithBackend(keyCode) {
        try {
            const response = await this.api.validateKey(keyCode);
            return response && response.isValid;
        } catch (error) {
            console.error('❌ Erro na validação da chave:', error);
            return false;
        }
    }

    validateEmail(event) {
        const emailField = event.target;
        const email = emailField.value.trim();

        emailField.classList.remove('is-valid', 'is-invalid');

        if (email.length > 0) {
            if (this.isValidEmail(email)) {
                emailField.classList.add('is-valid');
            } else {
                emailField.classList.add('is-invalid');
            }
        }
    }

    validateUsername(event) {
        const usernameField = event.target;
        const username = usernameField.value.trim();

        usernameField.classList.remove('is-valid', 'is-invalid');

        if (username.length > 0) {
            // Validar formato: letras, números, underscore
            const isValidFormat = /^[a-zA-Z0-9_]{3,20}$/.test(username);
            
            if (isValidFormat) {
                usernameField.classList.add('is-valid');
            } else {
                usernameField.classList.add('is-invalid');
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ===============================================
    // UI E MENSAGENS
    // ===============================================

    showMessage(containerId, message, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const alertClass = {
            'success': 'alert-success',
            'danger': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        };

        container.innerHTML = `
            <div class="alert ${alertClass[type]} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-hide after 5 seconds (except for errors)
        if (type !== 'danger') {
            setTimeout(() => {
                const alert = container.querySelector('.alert');
                if (alert) {
                    alert.remove();
                }
            }, 5000);
        }
    }

    clearMessage(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }

    setFormLoading(formId, isLoading) {
        const form = document.getElementById(formId);
        if (!form) return;

        const submitButton = form.querySelector('button[type="submit"]');
        const spinner = form.querySelector('.spinner-border');

        if (submitButton) {
            submitButton.disabled = isLoading;
        }

        if (spinner) {
            if (isLoading) {
                spinner.classList.remove('d-none');
            } else {
                spinner.classList.add('d-none');
            }
        }

        // Desabilitar todos os inputs
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = isLoading;
        });
    }

    // ===============================================
    // NAVEGAÇÃO
    // ===============================================

    redirectToDashboard() {
        const user = this.authManager.getCurrentUser();
        
        // Redirecionar baseado na permissão
        if (user && user.permissao === 'Administrador') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }

    switchToLogin() {
        // Trocar para tab de login
        const loginTab = document.querySelector('#login-tab');
        if (loginTab) {
            const tab = new bootstrap.Tab(loginTab);
            tab.show();
        }
        
        this.currentTab = 'login';
        this.clearMessage('registerMessage');
    }

    switchToRegister() {
        // Trocar para tab de registro
        const registerTab = document.querySelector('#register-tab');
        if (registerTab) {
            const tab = new bootstrap.Tab(registerTab);
            tab.show();
        }
        
        this.currentTab = 'register';
        this.clearMessage('loginMessage');
    }

    // Método para trocar tabs (compatibilidade)
    showTab(tabName) {
        this.currentTab = tabName;
        
        // Limpar mensagens ao trocar de tab
        this.clearMessage('loginMessage');
        this.clearMessage('registerMessage');
        
        // Limpar validações
        const forms = document.querySelectorAll('#loginForm, #registerForm');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('.is-valid, .is-invalid');
            inputs.forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });
        });
    }

    // ===============================================
    // SISTEMA DE TOASTS
    // ===============================================

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toastId = 'toast_' + Date.now();
        
        const bgClass = {
            'success': 'bg-success',
            'danger': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        };

        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert">
                <div class="toast-header ${bgClass[type]} text-white">
                    <strong class="me-auto">CONDUCTOR</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);

        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });

        toast.show();

        // Remover elemento após esconder
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    // ===============================================
    // MÉTODOS DE DEBUG
    // ===============================================

    debugFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        console.group(`🔍 Debug - Dados do formulário ${formId}`);
        console.table(data);
        console.groupEnd();
    }

    testValidations() {
        console.group('🔍 Debug - Testando validações');
        
        // Testar email
        console.log('Email válido (test@test.com):', this.isValidEmail('test@test.com'));
        console.log('Email inválido (test):', this.isValidEmail('test'));
        
        // Testar validação de chave (mock)
        console.log('Formato de chave válido:', /^[A-Z0-9]{16}$/.test('ABCD1234EFGH5678'));
        console.log('Formato de chave inválido:', /^[A-Z0-9]{16}$/.test('abc123'));
        
        console.groupEnd();
    }
}

// ===============================================
// INICIALIZAÇÃO GLOBAL
// ===============================================

// Aguardar DOM e dependências
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se dependências estão disponíveis
    if (!window.conductorAPI) {
        console.error('❌ ConductorAPI não disponível');
        return;
    }

    if (!window.authManager) {
        console.error('❌ AuthManager não disponível');
        return;
    }
    
    // Inicializar LoginPage
    const loginPage = new LoginPage();
    
    // Disponibilizar globalmente para debug
    window.loginPage = loginPage;
    
    console.log('✅ LoginPage inicializado completamente');
});

// Event listener para mudança de tabs (Bootstrap)
document.addEventListener('shown.bs.tab', (e) => {
    if (window.loginPage) {
        const tabId = e.target.getAttribute('data-bs-target');
        if (tabId === '#login-pane') {
            window.loginPage.showTab('login');
        } else if (tabId === '#register-pane') {
            window.loginPage.showTab('register');
        }
    }
});

console.log('🔐 CONDUCTOR - Login.js FINAL carregado!');