// AUTH UTILS - CONDUCTOR
class AuthManager {
    constructor() {
        this.api = window.conductorAPI;
        this.redirectAfterLogin = 'dashboard.html';
    }

    // Verificar autenticação em páginas protegidas
    async requireAuth() {
        if (!this.api.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }

        // Validar token
        const isValid = await this.api.validateToken();
        if (!isValid) {
            this.redirectToLogin();
            return false;
        }

        return true;
    }

    // Verificar permissões específicas
    async requirePermission(permission) {
        const isAuth = await this.requireAuth();
        if (!isAuth) return false;

        if (!this.api.hasPermission(permission)) {
            this.showAccessDenied();
            return false;
        }

        return true;
    }

    // Verificar se é admin
    async requireAdmin() {
        return this.requirePermission('Administrador');
    }

    // Verificar se é desenvolvedor
    async requireDeveloper() {
        return this.requirePermission('Desenvolvedor');
    }

    // Redirecionar para login
    redirectToLogin() {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html') {
            window.location.href = 'login.html';
        }
    }

    // Mostrar acesso negado
    showAccessDenied() {
        alert('Acesso negado! Você não tem permissão para acessar esta página.');
        window.location.href = 'dashboard.html';
    }

    // Auto-logout após inatividade
    setupAutoLogout(minutes = 60) {
        let inactivityTimer;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                alert('Sua sessão expirou por inatividade.');
                this.api.logout();
            }, minutes * 60 * 1000);
        };

        // Eventos que resetam o timer
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        resetTimer();
    }

    // Obter informações do usuário atual
    getCurrentUser() {
        return this.api.getCurrentUser();
    }

    // Formatar nome de exibição
    getDisplayName() {
        const user = this.getCurrentUser();
        return user ? user.nome_usuario : 'Usuário';
    }

    // Obter cor da permissão
    getPermissionColor(permission) {
        const colors = {
            'Visitante': '#999999',
            'Usuario': '#4CAF50',
            'Operador': '#2196F3',
            'Administrador': '#FF9800',
            'Desenvolvedor': '#FFD700'
        };
        return colors[permission] || '#999999';
    }

    // Obter ícone da permissão
    getPermissionIcon(permission) {
        const icons = {
            'Visitante': '👁️',
            'Usuario': '👤',
            'Operador': '⚙️',
            'Administrador': '👑',
            'Desenvolvedor': '⚡'
        };
        return icons[permission] || '👤';
    }
}

// Instância global do auth manager
window.authManager = new AuthManager();

// Função para proteger páginas
window.protectPage = async (requiredPermission = null) => {
    if (requiredPermission) {
        return await window.authManager.requirePermission(requiredPermission);
    } else {
        return await window.authManager.requireAuth();
    }
};

// Função para logout
window.logout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
        window.conductorAPI.logout();
    }
};