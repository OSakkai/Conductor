// AUTH MANAGER - CONDUCTOR
// Sistema de autenticação e autorização corrigido e otimizado

class AuthManager {
    constructor() {
        // Verificar se ConductorAPI está disponível
        if (!window.conductorAPI) {
            console.error('❌ ConductorAPI não encontrado! AuthManager não pode ser inicializado.');
            return;
        }
        
        this.api = window.conductorAPI;
        this.redirectAfterLogin = 'dashboard.html';
        this.currentUser = null;
        this.authChangeCallback = null;
        
        // Carregar usuário do localStorage
        this.loadUserFromStorage();
        
        console.log('✅ AuthManager inicializado');
    }

    // ===============================================
    // VERIFICAÇÕES DE AUTENTICAÇÃO
    // ===============================================

    // Verificar se está autenticado
    isAuthenticated() {
        return !!this.api.token && !!this.currentUser;
    }

    // Carregar usuário do localStorage
    loadUserFromStorage() {
        try {
            const userStr = localStorage.getItem('conductor_user');
            if (userStr) {
                this.currentUser = JSON.parse(userStr);
                console.log('👤 Usuário carregado:', this.currentUser.nome_usuario);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuário do localStorage:', error);
            this.currentUser = null;
        }
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser || this.api.getCurrentUser();
    }

    // Verificar autenticação em páginas protegidas
    async requireAuth() {
        try {
            // Verificar se tem token
            if (!this.api.isAuthenticated()) {
                console.log('❌ Não autenticado - redirecionando para login');
                this.redirectToLogin();
                return false;
            }

            // Validar token no servidor
            const validationResult = await this.api.validateToken();
            if (!validationResult) {
                console.log('❌ Token inválido - redirecionando para login');
                this.redirectToLogin();
                return false;
            }

            // Atualizar dados do usuário se necessário
            if (validationResult && validationResult.id) {
                this.currentUser = validationResult;
                localStorage.setItem('conductor_user', JSON.stringify(validationResult));
            }

            return true;

        } catch (error) {
            console.error('❌ Erro na verificação de autenticação:', error);
            this.redirectToLogin();
            return false;
        }
    }

    // ===============================================
    // VERIFICAÇÕES DE PERMISSÃO
    // ===============================================

    // Verificar permissões específicas
    async requirePermission(permission) {
        const isAuth = await this.requireAuth();
        if (!isAuth) return false;

        // ✅ SE FOR VISITANTE E PEDIR 'Usuario', PERMITIR ACESSO
        const user = this.getCurrentUser();
        if (user?.permissao === 'Visitante' && permission === 'Usuario') {
            console.log('🔓 Visitante acessando dashboard - permitido');
            return true;
        }

        if (!this.hasPermission(permission)) {
            this.showAccessDenied();
            return false;
        }

        return true;
    }

    // Verificar se tem uma permissão específica
    hasPermission(requiredPermission) {
        const user = this.getCurrentUser();
        if (!user) {
            console.log('❌ Usuário não encontrado para verificação de permissão');
            return false;
        }

        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        const userLevel = permissions.indexOf(user.permissao);
        const requiredLevel = permissions.indexOf(requiredPermission);

        if (userLevel === -1) {
            console.warn('⚠️ Permissão de usuário desconhecida:', user.permissao);
            return false;
        }

        if (requiredLevel === -1) {
            console.warn('⚠️ Permissão requerida desconhecida:', requiredPermission);
            return false;
        }

        const hasAccess = userLevel >= requiredLevel;
        console.log(`🔐 Verificação de permissão: ${user.permissao} ${hasAccess ? '✅' : '❌'} ${requiredPermission}`);
        
        return hasAccess;
    }

    // Verificar se é admin
    async requireAdmin() {
        return this.requirePermission('Administrador');
    }

    // Verificar se é desenvolvedor
    async requireDeveloper() {
        return this.requirePermission('Desenvolvedor');
    }

    // Verificar se é operador ou superior
    async requireOperator() {
        return this.requirePermission('Operador');
    }

    // Verificar se é usuário ou superior
    async requireUser() {
        return this.requirePermission('Usuario');
    }

    // ===============================================
    // NAVEGAÇÃO E REDIRECIONAMENTO
    // ===============================================

    // Redirecionar para login
    redirectToLogin() {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html') {
            console.log('🔄 Redirecionando para página de login');
            window.location.href = 'login.html';
        }
    }

    // Mostrar acesso negado
    showAccessDenied() {
        const user = this.getCurrentUser();
        const userName = user ? user.nome_usuario : 'Usuário';
        const userPermission = user ? user.permissao : 'Desconhecida';
        
        alert(`❌ ACESSO NEGADO!\n\nUsuário: ${userName}\nPermissão: ${userPermission}\n\nVocê não tem permissão para acessar esta página.`);
        
        console.log('❌ Acesso negado - redirecionando para dashboard');
        window.location.href = 'dashboard.html';
    }

    // Redirecionar após login
    redirectAfterAuth() {
        window.location.href = this.redirectAfterLogin;
    }

    // ===============================================
    // PROTEÇÃO DE PÁGINAS
    // ===============================================

    // Proteger página atual (função global para compatibilidade)
    async protectPage(requiredPermission = 'Usuario') {
        return this.requirePermission(requiredPermission);
    }

    // Proteger página de admin
    async protectAdminPage() {
        return this.requireAdmin();
    }

    // Proteger página de desenvolvedor
    async protectDeveloperPage() {
        return this.requireDeveloper();
    }

    // ===============================================
    // GESTÃO DE SESSÃO
    // ===============================================

    // Auto-logout após inatividade
    setupAutoLogout(minutes = 60) {
        let inactivityTimer;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log('⏰ Sessão expirada por inatividade');
                alert('Sua sessão expirou por inatividade. Você será redirecionado para o login.');
                this.logout();
            }, minutes * 60 * 1000);
        };

        // Eventos para detectar atividade
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        // Iniciar timer
        resetTimer();
    }

    // Logout
    logout() {
        this.api.removeToken();
        this.currentUser = null;
        this.triggerAuthChange();
        window.location.href = 'login.html';
    }

    // ===============================================
    // MÉTODOS DE UI E AVATAR - OS QUE ESTAVAM FALTANDO
    // ===============================================

    // Obter avatar do usuário (iniciais)
    getUserAvatar() {
        const user = this.getCurrentUser();
        if (!user || !user.nome_usuario) return '?';
        
        return user.nome_usuario
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    // Obter ícone da permissão
    getPermissionIcon(permission) {
        const icons = {
            'Visitante': '👁️',
            'Usuario': '👤',
            'Operador': '🔧',
            'Administrador': '⚙️',
            'Desenvolvedor': '👨‍💻'
        };
        return icons[permission] || '👤';
    }

    // Atualizar dados do usuário atual
    updateCurrentUser(userData) {
        this.currentUser = userData;
        localStorage.setItem('conductor_user', JSON.stringify(userData));
        console.log('👤 Dados do usuário atualizados:', userData);
        this.triggerAuthChange();
    }

    // Atualizar informações do usuário na UI
    updateUserDisplay() {
        const user = this.getCurrentUser();
        if (!user) return;

        // Atualizar elementos comuns da UI
        const userNameElements = document.querySelectorAll('[data-user-name]');
        const userEmailElements = document.querySelectorAll('[data-user-email]');
        const userPermissionElements = document.querySelectorAll('[data-user-permission]');
        const userAvatarElements = document.querySelectorAll('[data-user-avatar]');

        userNameElements.forEach(el => {
            el.textContent = user.nome_usuario || 'Usuário';
        });

        userEmailElements.forEach(el => {
            el.textContent = user.email || '';
        });

        userPermissionElements.forEach(el => {
            el.textContent = user.permissao || 'Visitante';
            el.className = `permission-badge permission-${(user.permissao || 'visitante').toLowerCase()}`;
        });

        userAvatarElements.forEach(el => {
            el.textContent = this.getUserAvatar();
        });
    }

    // Mostrar/ocultar elementos baseado em permissões
    applyPermissionBasedVisibility() {
        const user = this.getCurrentUser();
        if (!user) return;

        // Elementos que requerem admin
        const adminElements = document.querySelectorAll('[data-requires="admin"]');
        adminElements.forEach(el => {
            el.style.display = this.hasPermission('Administrador') ? '' : 'none';
        });

        // Elementos que requerem desenvolvedor
        const devElements = document.querySelectorAll('[data-requires="developer"]');
        devElements.forEach(el => {
            el.style.display = this.hasPermission('Desenvolvedor') ? '' : 'none';
        });

        // Elementos que requerem operador
        const operatorElements = document.querySelectorAll('[data-requires="operator"]');
        operatorElements.forEach(el => {
            el.style.display = this.hasPermission('Operador') ? '' : 'none';
        });
    }

    // ===============================================
    // EVENTOS E CALLBACKS
    // ===============================================

    // Registrar callback para mudanças de autenticação
    onAuthChange(callback) {
        if (typeof callback === 'function') {
            this.authChangeCallback = callback;
        }
    }

    // Executar callback de mudança de auth
    triggerAuthChange() {
        if (this.authChangeCallback) {
            this.authChangeCallback(this.getCurrentUser());
        }
    }

    // ===============================================
    // MÉTODOS DE DEBUG
    // ===============================================

    // Debug: Mostrar informações de autenticação
    debugAuth() {
        const user = this.getCurrentUser();
        const token = this.api.token;
        
        console.group('🔍 Debug - Autenticação');
        console.log('Token:', token ? '✅ Presente' : '❌ Ausente');
        console.log('Usuário:', user);
        console.log('Autenticado:', this.isAuthenticated());
        
        if (user) {
            console.log('Permissões disponíveis:');
            const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
            permissions.forEach(perm => {
                console.log(`  ${perm}: ${this.hasPermission(perm) ? '✅' : '❌'}`);
            });
        }
        
        console.groupEnd();
    }

    // Debug: Testar todas as permissões
    debugPermissions() {
        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        
        console.group('🔍 Debug - Permissões');
        permissions.forEach(permission => {
            const hasAccess = this.hasPermission(permission);
            console.log(`${permission}: ${hasAccess ? '✅' : '❌'}`);
        });
        console.groupEnd();
    }
}

// ===============================================
// INSTÂNCIA GLOBAL E FUNÇÕES DE COMPATIBILIDADE
// ===============================================

// Criar instância global do AuthManager
window.authManager = new AuthManager();

// Funções globais para compatibilidade com código existente
window.protectPage = async function(requiredPermission = 'Usuario') {
    if (window.authManager) {
        // ✅ VISITANTE PODE ACESSAR DASHBOARD SEM PROBLEMAS
        const user = window.authManager.getCurrentUser();
        if (user?.permissao === 'Visitante' && requiredPermission === 'Usuario') {
            console.log('🔓 Visitante acessando página - permitido');
            return true;
        }
        return window.authManager.protectPage(requiredPermission);
    }
    console.error('❌ AuthManager não disponível');
    return false;
};

window.requireAuth = async function() {
    if (window.authManager) {
        return window.authManager.requireAuth();
    }
    console.error('❌ AuthManager não disponível');
    return false;
};

window.requireAdmin = async function() {
    if (window.authManager) {
        return window.authManager.requireAdmin();
    }
    console.error('❌ AuthManager não disponível');
    return false;
};

window.logout = function() {
    if (window.authManager) {
        window.authManager.logout();
    } else {
        console.error('❌ AuthManager não disponível');
        // Fallback
        localStorage.clear();
        window.location.href = 'login.html';
    }
};

// Auto-setup quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    if (window.authManager) {
        // Atualizar display do usuário
        window.authManager.updateUserDisplay();
        
        // Aplicar visibilidade baseada em permissões
        window.authManager.applyPermissionBasedVisibility();
        
        // Configurar auto-logout (60 minutos)
        window.authManager.setupAutoLogout(60);
        
        console.log('✅ AuthManager configurado e pronto');
    }
});

console.log('🔐 AUTH LIMPO carregado!');