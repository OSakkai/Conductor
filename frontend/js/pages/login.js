// LOGIN PAGE - CONDUCTOR
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
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Validação em tempo real
        document.getElementById('regPasswordConfirm').addEventListener('input', (e) => this.validatePasswordMatch(e));
        document.getElementById('accessKey').addEventListener('input', (e) => this.validateAccessKey(e));
    }

    // Trocar entre tabs Login/Registro
    showTab(tabName) {
        // Remover active das tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        // Ativar tab selecionada
        event.target.classList.add('active');
        document.getElementById(tabName + 'Form').classList.add('active');
        
        this.currentTab = tabName;
        this.hideMessage();
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
            }
        }
    }

    // Handle Login
    async handleLogin(e) {
        e.preventDefault();
        
        const button = e.target.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('.btn-text');
        const loading = button.querySelector('.loading');
        
        // Dados do formulário
        const formData = new FormData(e.target);
        const data = {
            nome_usuario: formData.get('username'),
            senha: formData.get('password')
        };

        try {
            // UI Loading
            button.classList.add('loading');
            button.disabled = true;
            this.hideMessage();

            // Fazer login
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Sucesso - salvar token e redirecionar
                localStorage.setItem('conductor_token', result.access_token);
                localStorage.setItem('conductor_user', JSON.stringify(result.user));
                
                this.showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                // Erro
                this.showMessage(result.message || 'Erro ao fazer login', 'error');
            }
        } catch (error) {
            this.showMessage('Erro de conexão. Tente novamente.', 'error');
        } finally {
            // UI Reset
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Handle Registro
    async handleRegister(e) {
        e.preventDefault();
        
        const button = e.target.querySelector('button[type="submit"]');
        const formData = new FormData(e.target);
        
        // Validar senhas
        if (!this.validatePasswords()) {
            return;
        }

        // Dados do formulário
        const data = {
            nome_usuario: formData.get('username'),
            email: formData.get('email'),
            celular: formData.get('phone') || null,
            funcao: formData.get('function'),
            senha: formData.get('password'),
            chave_acesso: formData.get('accessKey') || null
        };

        try {
            // UI Loading
            button.classList.add('loading');
            button.disabled = true;
            this.hideMessage();

            // Fazer registro
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Sucesso
                this.showMessage('Conta criada com sucesso! Faça login para continuar.', 'success');
                
                // Limpar formulário e trocar para login
                e.target.reset();
                setTimeout(() => {
                    this.showTab('login');
                }, 2000);
            } else {
                // Erro
                this.showMessage(result.message || 'Erro ao criar conta', 'error');
            }
        } catch (error) {
            this.showMessage('Erro de conexão. Tente novamente.', 'error');
        } finally {
            // UI Reset
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Validar senhas
    validatePasswords() {
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            this.showMessage('As senhas não coincidem', 'error');
            return false;
        }
        
        if (password.length < 3) {
            this.showMessage('A senha deve ter pelo menos 3 caracteres', 'error');
            return false;
        }
        
        return true;
    }

    // Validar confirmação de senha em tempo real
    validatePasswordMatch(e) {
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = e.target.value;
        
        if (passwordConfirm && password !== passwordConfirm) {
            e.target.style.borderColor = 'var(--error)';
        } else {
            e.target.style.borderColor = 'var(--gray-medium)';
        }
    }

    // Validar chave de acesso
    validateAccessKey(e) {
        const key = e.target.value;
        if (key.length > 0) {
            // Adicionar visual feedback se a chave tiver formato válido
            if (key.length >= 8) {
                e.target.style.borderColor = 'var(--primary-yellow)';
            } else {
                e.target.style.borderColor = 'var(--warning)';
            }
        } else {
            e.target.style.borderColor = 'var(--gray-medium)';
        }
    }

    // Mostrar mensagens
    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide mensagens de sucesso
        if (type === 'success') {
            setTimeout(() => this.hideMessage(), 5000);
        }
    }

    // Esconder mensagens
    hideMessage() {
        const messageEl = document.getElementById('message');
        messageEl.style.display = 'none';
    }
}

// Função global para tabs (chamada pelo HTML)
function showTab(tabName) {
    window.loginPage.showTab(tabName);
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.loginPage = new LoginPage();
});