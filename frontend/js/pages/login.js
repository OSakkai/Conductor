// ===============================================
// LOGIN PAGE - CONDUCTOR (ORIGINAL FUNCIONANDO)
// frontend/js/pages/login.js
// ===============================================

class LoginPage {
    constructor() {
        this.currentTab = 'login';
        this.init();
    }

    init() {
        // Event listeners
        this.setupEventListeners();
        
        // Verificar se já está logado
        this.checkAuth();
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
        
        if (passwordConfirm) {
            passwordConfirm.addEventListener('input', (e) => this.validatePasswordMatch(e));
        }
        
        if (accessKey) {
            accessKey.addEventListener('input', (e) => this.validateAccessKey(e));
        }
    }

    // Verificar se já está autenticado
    async checkAuth() {
        const token = localStorage.getItem('conductor_token');
        if (token) {
            // Verificar se token é válido
            try {
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    // Redirecionar para dashboard
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                // Token inválido, remover
                localStorage.removeItem('conductor_token');
                localStorage.removeItem('conductor_user');
            }
        }
    }

    // Handle Login - ORIGINAL
    async handleLogin(e) {
        e.preventDefault();
        
        const button = e.target.querySelector('button[type="submit"]');
        const spinner = document.getElementById('loginSpinner');
        const formData = new FormData(e.target);
        
        try {
            // Show loading
            button.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
            
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            console.log('🔄 Tentando login com:', { username: credentials.username });

            const result = await window.conductorAPI.login(credentials);
            
            if (result && result.access_token) {
                this.showMessage('loginMessage', 'Login realizado com sucesso!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error(result?.message || 'Credenciais inválidas');
            }
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            this.showMessage('loginMessage', 'Erro no login: ' + error.message, 'danger');
        } finally {
            button.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    }

    // Handle Register - ORIGINAL
    async handleRegister(e) {
        e.preventDefault();
        
        const button = e.target.querySelector('button[type="submit"]');
        const spinner = document.getElementById('registerSpinner');
        const formData = new FormData(e.target);
        
        try {
            // Validate passwords match
            if (!this.validatePasswordMatch()) {
                this.showMessage('registerMessage', 'As senhas não coincidem', 'warning');
                return;
            }
            
            // Show loading
            button.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
            
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                funcao: formData.get('funcao') || null,
                accessKey: formData.get('accessKey')
            };

            console.log('🔄 Tentando registro com:', { 
                username: userData.username, 
                email: userData.email 
            });

            const result = await window.conductorAPI.register(userData);
            
            if (result && result.success !== false) {
                this.showMessage('registerMessage', 'Conta criada com sucesso! Redirecionando...', 'success');
                
                // Auto-login after successful registration
                setTimeout(async () => {
                    await this.handleAutoLogin(userData.username, userData.password);
                }, 1500);
            } else {
                throw new Error(result?.message || 'Erro no registro');
            }
            
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            this.showMessage('registerMessage', 'Erro no registro: ' + error.message, 'danger');
        } finally {
            button.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    }

    async handleAutoLogin(username, password) {
        try {
            const result = await window.conductorAPI.login({ username, password });
            if (result && result.access_token) {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('❌ Erro no auto-login:', error);
            this.showMessage('registerMessage', 'Conta criada! Faça login manualmente.', 'info');
            // Switch to login tab
            const loginTab = document.getElementById('login-tab');
            if (loginTab) {
                const tab = new bootstrap.Tab(loginTab);
                tab.show();
            }
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('regPassword');
        const confirmPassword = document.getElementById('regPasswordConfirm');
        
        if (!password || !confirmPassword) return true;
        
        const passwordValue = password.value;
        const confirmValue = confirmPassword.value;
        
        if (confirmValue && passwordValue !== confirmValue) {
            confirmPassword.classList.add('is-invalid');
            confirmPassword.classList.remove('is-valid');
            return false;
        } else {
            confirmPassword.classList.remove('is-invalid');
            if (confirmValue) confirmPassword.classList.add('is-valid');
            return true;
        }
    }

    validateAccessKey() {
        const accessKey = document.getElementById('accessKey');
        if (!accessKey) return;
        
        const value = accessKey.value;
        
        // Basic validation - check if it looks like a valid key format
        if (value.length > 10 && /^[A-Za-z0-9]+$/.test(value)) {
            accessKey.classList.remove('is-invalid');
            accessKey.classList.add('is-valid');
        } else if (value.length > 0) {
            accessKey.classList.add('is-invalid');
            accessKey.classList.remove('is-valid');
        } else {
            accessKey.classList.remove('is-invalid', 'is-valid');
        }
    }

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

    // Método para trocar tabs (se necessário)
    showTab(tabName) {
        this.currentTab = tabName;
        
        // Hide all messages when switching tabs
        const loginMessage = document.getElementById('loginMessage');
        const registerMessage = document.getElementById('registerMessage');
        
        if (loginMessage) loginMessage.classList.add('d-none');
        if (registerMessage) registerMessage.classList.add('d-none');
    }
}

// ===============================================
// INICIALIZAÇÃO ORIGINAL
// ===============================================

// Aguardar DOM e dependências
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se dependências estão disponíveis
    if (!window.conductorAPI) {
        console.error('❌ ConductorAPI não disponível');
        return;
    }
    
    // Inicializar LoginPage
    const loginPage = new LoginPage();
    
    // Disponibilizar globalmente para debug
    window.loginPage = loginPage;
    
    console.log('✅ LoginPage inicializado');
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

console.log('✅ Login.js carregado');