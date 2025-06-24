// ===============================================
// CONDUCTOR - AUTH MANAGER COMPLETO E CORRIGIDO
// frontend/js/utils/auth.js
// TODAS AS 4 FASES IMPLEMENTADAS
// SOLUÇÕES DO DOC III APLICADAS
// ===============================================

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
        this.autoLogoutTimer = null; // ✅ FASE 3: Auto logout
        
        // Carregar usuário do localStorage
        this.loadUserFromStorage();
        
        console.log('✅ AuthManager inicializado');
    }

    // ===============================================
    // VERIFICAÇÕES DE AUTENTICAÇÃO - FASE 1
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

    // ✅ FASE 1: Verificação simplificada baseada no Doc III
    // Lição: "Validação de token deve ser opcional, não automática na proteção de páginas"
    async requireAuth() {
        try {
            // Verificar se tem token
            if (!this.api.isAuthenticated()) {
                console.log('❌ Não autenticado - redirecionando para login');
                this.redirectToLogin();
                return false;
            }

            // ✅ CORREÇÃO CRÍTICA do Doc III: Não fazer validação automática que causa loops
            // Apenas verificar se tem usuário carregado
            const user = this.getCurrentUser();
            if (!user) {
                console.log('❌ Dados do usuário não encontrados');
                this.redirectToLogin();
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Erro na verificação de autenticação:', error);
            this.redirectToLogin();
            return false;
        }
    }

    // ===============================================
    // VERIFICAÇÕES DE PERMISSÃO - FASE 1
    // ===============================================

    // Verificar permissões específicas
    async requirePermission(permission) {
        const isAuth = await this.requireAuth();
        if (!isAuth) return false;

        // ✅ CORREÇÃO CRÍTICA do Doc III: SE FOR VISITANTE E PEDIR 'Usuario', PERMITIR ACESSO
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
        console.log(`🔐 Verificação de permissão: ${user.permissao} ${hasAccess ? '≥' : '<'} ${requiredPermission} = ${hasAccess ? '✅' : '❌'}`);
        
        return hasAccess;
    }

    // Shortcuts para permissões específicas
    async requireAdmin() {
        return this.requirePermission('Administrador');
    }

    async requireOperator() {
        return this.requirePermission('Operador');
    }

    async requireDeveloper() {
        return this.requirePermission('Desenvolvedor');
    }

    // ===============================================
    // PROTEÇÃO DE PÁGINAS - FASE 1
    // ===============================================

    async protectPage(requiredPermission = 'Usuario') {
        return this.requirePermission(requiredPermission);
    }

    // ===============================================
    // GERENCIAMENTO DE SESSÃO - FASE 3
    // ===============================================

    // ✅ FASE 3: Auto-logout por inatividade
    setupAutoLogout(minutes = 60) {
        this.clearAutoLogout();
        
        const milliseconds = minutes * 60 * 1000;
        this.autoLogoutTimer = setTimeout(() => {
            console.log('⏰ Sessão expirada por inatividade');
            this.logout();
            alert('Sua sessão expirou devido à inatividade.');
        }, milliseconds);

        console.log(`⏰ Auto-logout configurado para ${minutes} minutos`);
    }

    clearAutoLogout() {
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
            this.autoLogoutTimer = null;
        }
    }

    // Resetar timer de auto-logout em atividade
    resetAutoLogout() {
        if (this.autoLogoutTimer) {
            this.setupAutoLogout(60); // Reset para 60 minutos
        }
    }

    // ===============================================
    // LOGIN E LOGOUT - FASE 1 & 3
    // ===============================================

    async login(credentials) {
        try {
            const response = await this.api.login(credentials);
            
            if (response && response.success) {
                this.currentUser = response.user;
                this.setupAutoLogout(60); // ✅ FASE 3: Configurar auto-logout
                
                // Trigger callback se configurado
                if (this.authChangeCallback) {
                    this.authChangeCallback(true, this.currentUser);
                }
                
                console.log('✅ Login realizado via AuthManager');
                return response;
            } else {
                throw new Error('Falha no login');
            }
        } catch (error) {
            console.error('❌ Erro no login AuthManager:', error);
            throw error;
        }
    }

    // ✅ FASE 3: Logout com invalidação backend
    async logout() {
        try {
            // Tentar logout no backend
            await this.api.logout();
        } catch (error) {
            console.warn('⚠️ Erro no logout backend:', error);
        } finally {
            // Limpar dados locais
            this.currentUser = null;
            this.clearAutoLogout();
            
            // Trigger callback se configurado
            if (this.authChangeCallback) {
                this.authChangeCallback(false, null);
            }
            
            console.log('✅ Logout realizado');
            this.redirectToLogin();
        }
    }

    // ===============================================
    // REDIRECIONAMENTOS - FASE 1
    // ===============================================

    redirectToLogin() {
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    redirectToDashboard() {
        if (window.location.pathname !== '/dashboard.html') {
            window.location.href = this.redirectAfterLogin;
        }
    }

    showAccessDenied() {
        alert('Acesso negado. Você não tem permissão para acessar este recurso.');
        this.redirectToDashboard();
    }

    // ===============================================
    // INTERFACE DO USUÁRIO - FASE 4
    // ===============================================

    // Atualizar display do usuário na interface
    updateUserDisplay() {
        const user = this.getCurrentUser();
        if (!user) return;

        // ✅ CORREÇÃO CRÍTICA do Doc III: Usar campos corretos
        // Lição: "Sempre usar nomes exatos dos campos do banco"
        
        // Atualizar nome do usuário
        const userNameElements = document.querySelectorAll('[data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = user.nome_usuario; // ✅ nome_usuario, não username
        });

        // Atualizar email do usuário
        const userEmailElements = document.querySelectorAll('[data-user-email]');
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });

        // Atualizar permissão
        const userRoleElements = document.querySelectorAll('[data-user-role]');
        userRoleElements.forEach(el => {
            el.textContent = user.permissao; // ✅ permissao, não permission
        });

        // Atualizar avatar
        const userAvatarElements = document.querySelectorAll('[data-user-avatar]');
        userAvatarElements.forEach(el => {
            el.src = this.getUserAvatar(user);
        });

        console.log('🎨 Display do usuário atualizado');
    }

    // ✅ CORREÇÃO CRÍTICA: Avatar local em vez de dependência externa
    getUserAvatar(user = null) {
        const currentUser = user || this.getCurrentUser();
        if (!currentUser) return '/images/default-avatar.png';

        // Gerar iniciais do nome para avatar local
        const initials = currentUser.nome_usuario
            ?.split(' ')
            ?.map(word => word.charAt(0).toUpperCase())
            ?.slice(0, 2)
            ?.join('') || 'U';
        
        // Retornar path para avatar padrão - sem dependências externas
        return `/images/avatars/${initials.toLowerCase()}-avatar.png`;
    }

    // ✅ FASE 4: Ícone baseado na permissão (resolução do Doc III)
    getPermissionIcon(permission = null) {
        const userPermission = permission || this.getCurrentUser()?.permissao;
        
        const icons = {
            'Visitante': '👁️',
            'Usuario': '👤',
            'Operador': '⚙️',
            'Administrador': '👑',
            'Desenvolvedor': '💻'
        };

        return icons[userPermission] || '👤';
    }

    // Aplicar visibilidade baseada em permissões
    applyPermissionBasedVisibility() {
        const user = this.getCurrentUser();
        if (!user) return;

        // Elementos que requerem permissões específicas
        const permissionElements = document.querySelectorAll('[data-requires-permission]');
        
        permissionElements.forEach(element => {
            const requiredPermission = element.getAttribute('data-requires-permission');
            const hasPermission = this.hasPermission(requiredPermission);
            
            if (hasPermission) {
                element.style.display = '';
                element.removeAttribute('disabled');
            } else {
                element.style.display = 'none';
                element.setAttribute('disabled', 'disabled');
            }
        });

        console.log('🔒 Visibilidade baseada em permissões aplicada');
    }

    // ===============================================
    // VALIDAÇÃO DE TOKEN - FASE 1 & 3
    // ===============================================

    // ✅ FASE 1: Validação manual de token (para uso específico)
    async validateCurrentToken() {
        try {
            const user = await this.api.validateToken();
            if (user) {
                this.currentUser = user;
                localStorage.setItem('conductor_user', JSON.stringify(user));
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erro na validação do token:', error);
            return false;
        }
    }

    // ===============================================
    // CALLBACKS E EVENTOS - FASE 4
    // ===============================================

    // Configurar callback para mudanças de autenticação
    onAuthChange(callback) {
        this.authChangeCallback = callback;
    }

    // ✅ FASE 4: Setup de listeners para atividade do usuário
    setupActivityListeners() {
        const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const resetTimer = () => this.resetAutoLogout();
        
        activities.forEach(activity => {
            document.addEventListener(activity, resetTimer, { passive: true });
        });

        console.log('👂 Listeners de atividade configurados');
    }

    // ===============================================
    // DEBUGGING E UTILITÁRIOS - FASE 4
    // ===============================================

    // Debug: Imprimir informações de autenticação
    debugAuth() {
        const user = this.getCurrentUser();
        
        console.group('🔍 Debug - Autenticação');
        console.log('Autenticado:', this.isAuthenticated());
        console.log('Token:', this.api.token ? '✅ Presente' : '❌ Ausente');
        console.log('Usuário:', user);
        console.log('Permissão:', user?.permissao || 'N/A');
        
        if (user) {
            const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
            console.log('Verificação de permissões:');
            permissions.forEach(permission => {
                const hasAccess = this.hasPermission(permission);
                console.log(`  ${permission}: ${hasAccess ? '✅' : '❌'}`);
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

// ✅ CORREÇÃO do Doc III: Funções globais para compatibilidade
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

// ✅ FASE 4: Auto-setup quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    if (window.authManager) {
        // Atualizar display do usuário
        window.authManager.updateUserDisplay();
        
        // Aplicar visibilidade baseada em permissões
        window.authManager.applyPermissionBasedVisibility();
        
        // Configurar auto-logout (60 minutos)
        window.authManager.setupAutoLogout(60);
        
        // Configurar listeners de atividade
        window.authManager.setupActivityListeners();
        
        console.log('✅ AuthManager configurado e pronto');
    }
});

console.log('🔐 AUTH MANAGER COMPLETO carregado!');