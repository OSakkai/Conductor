// ===============================================
// DASHBOARD - CONDUCTOR CORRIGIDO
// frontend/js/pages/dashboard.js
// ===============================================

class Dashboard {
    constructor() {
        this.currentMenuIndex = 0;
        this.menuCards = [];
        this.totalCards = 0;
        this.visibleCards = 3;
        this.init();
    }

    async init() {
        // Proteger página (requer autenticação)
        const isAuth = await protectPage();
        if (!isAuth) return;

        // Inicializar componentes
        this.setupMenuSystem();
        this.loadUserInfo();
        this.loadSystemStatus();
        this.loadStats(); // ✅ CORRIGIDO PARA RESPEITAR PERMISSÕES
        this.setupEventListeners();
        this.checkAdminAccess();
        this.setupButtonListeners();
        
        // Auto-refresh a cada 30 segundos
        setInterval(() => this.refreshData(), 30000);
    }

    setupButtonListeners() {
        // Event listeners para os botões dos cards
        const profileBtn = document.querySelector('[onclick="goToPage(\'profile.html\')"]');
        const adminBtn = document.querySelector('[onclick="goToPage(\'admin.html\')"]');

        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Botão Perfil clicado!');
                this.goToPage('profile.html');
            });
        }

        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Botão Admin clicado!');
                this.goToPage('admin.html');
            });
        }

        // Também adicionar aos cards completos
        const profileCard = document.querySelector('[data-page="profile"]');
        const adminCard = document.querySelector('[data-page="admin"]');

        if (profileCard) {
            profileCard.addEventListener('click', () => {
                console.log('Card Perfil clicado!');
                this.goToPage('profile.html');
            });
        }

        if (adminCard) {
            adminCard.addEventListener('click', () => {
                console.log('Card Admin clicado!');
                this.goToPage('admin.html');
            });
        }
    }

    goToPage(page) {
        console.log(`Navegando para: ${page}`);
        window.location.href = page;
    }

    setupMenuSystem() {
        this.menuCards = document.querySelectorAll('.menu-card');
        this.totalCards = this.menuCards.length;
        console.log(`Menu inicializado com ${this.totalCards} cards`);
    }

    navigateMenu(direction) {
        if (direction === 'left' && this.currentMenuIndex > 0) {
            this.currentMenuIndex--;
        } else if (direction === 'right' && this.currentMenuIndex < this.totalCards - this.visibleCards) {
            this.currentMenuIndex++;
        }
        this.updateMenuPosition();
    }

    updateMenuPosition() {
        const container = document.querySelector('.menu-scroll-container');
        if (container) {
            const cardWidth = 250; // Largura do card + gap
            const translateX = -this.currentMenuIndex * cardWidth;
            container.style.transform = `translateX(${translateX}px)`;
        }
    }

    loadUserInfo() {
        const user = authManager.getCurrentUser();
        if (user) {
            // ✅ USAR CAMPOS CORRETOS
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');
            
            if (userNameEl) userNameEl.textContent = user.nome_usuario || 'Usuário';
            if (userRoleEl) userRoleEl.textContent = user.permissao || 'Visitante';
        }
    }

    async loadSystemStatus() {
        try {
            // ✅ ENDPOINT SEGURO QUE VISITANTE PODE ACESSAR
            const response = await conductorAPI.get('/auth/test');
            
            if (response && response.status === 'OK') {
                this.updateSystemStatus('online', 'Sistema Online');
                this.updateDbStatus('Conectado');
            } else {
                this.updateSystemStatus('offline', 'Sistema Offline');
                this.updateDbStatus('Desconectado');
            }
        } catch (error) {
            console.error('Erro ao verificar status do sistema:', error);
            this.updateSystemStatus('offline', 'Sistema Offline');
            this.updateDbStatus('Erro');
        }
    }

    updateSystemStatus(status, text) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator) statusIndicator.className = `status-indicator status-${status}`;
        if (statusText) statusText.textContent = text;
        
        if (status === 'online') {
            if (statusIndicator) {
                statusIndicator.style.background = 'rgba(0, 255, 136, 0.1)';
                statusIndicator.style.borderColor = 'var(--success)';
            }
            if (statusDot) statusDot.style.background = 'var(--success)';
            if (statusText) statusText.style.color = 'var(--success)';
        } else {
            if (statusIndicator) {
                statusIndicator.style.background = 'rgba(255, 68, 68, 0.1)';
                statusIndicator.style.borderColor = 'var(--error)';
            }
            if (statusDot) statusDot.style.background = 'var(--error)';
            if (statusText) statusText.style.color = 'var(--error)';
        }
    }

    updateDbStatus(status) {
        const dbStatusEl = document.getElementById('dbStatus');
        if (dbStatusEl) dbStatusEl.textContent = status;
    }

    // ✅ CORRIGIDO: loadStats agora usa getSystemStats que respeita permissões
    async loadStats() {
        try {
            console.log('📊 Dashboard carregando estatísticas...');
            
            // ✅ USA O MÉTODO CORRIGIDO DO API.JS QUE RESPEITA PERMISSÕES
            const stats = await window.conductorAPI.getSystemStats();
            
            if (stats) {
                // Atualizar elementos se existirem
                const totalUsersEl = document.getElementById('totalUsers');
                const usersOnlineEl = document.getElementById('usersOnline');
                const activeProjectsEl = document.getElementById('activeProjects');
                const systemUptimeEl = document.getElementById('systemUptime');
                const notificationsEl = document.getElementById('notifications');
                
                if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 'N/A';
                if (usersOnlineEl) usersOnlineEl.textContent = stats.onlineUsers || '1';
                if (activeProjectsEl) activeProjectsEl.textContent = '3'; // Mock
                if (systemUptimeEl) systemUptimeEl.textContent = stats.uptime || 'N/A';
                if (notificationsEl) notificationsEl.textContent = '0'; // Mock
                
                console.log('✅ Estatísticas carregadas:', stats);
            }
            
            // Atualizar última atividade
            const lastActivityEl = document.getElementById('lastActivity');
            if (lastActivityEl) lastActivityEl.textContent = 'Agora';
            
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
            
            // ✅ FALLBACK SEGURO PARA VISITANTES
            const totalUsersEl = document.getElementById('totalUsers');
            const usersOnlineEl = document.getElementById('usersOnline');
            
            if (totalUsersEl) totalUsersEl.textContent = 'N/A';
            if (usersOnlineEl) usersOnlineEl.textContent = '1';
        }
    }

    async refreshData() {
        await this.loadSystemStatus();
        await this.loadStats();
        
        // Atualizar timestamp
        const lastActivityEl = document.getElementById('lastActivity');
        if (lastActivityEl) lastActivityEl.textContent = 'Agora';
    }

    checkAdminAccess() {
        // Mostrar/esconder elementos baseado em permissões
        if (authManager.hasPermission('Administrador')) {
            const adminElements = document.querySelectorAll('[data-requires="admin"]');
            adminElements.forEach(el => el.style.display = '');
        }
    }

    setupEventListeners() {
        // Navigation
        const leftBtn = document.querySelector('.nav-btn.left');
        const rightBtn = document.querySelector('.nav-btn.right');
        
        if (leftBtn) leftBtn.addEventListener('click', () => this.navigateMenu('left'));
        if (rightBtn) rightBtn.addEventListener('click', () => this.navigateMenu('right'));
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.navigateMenu('left');
            if (e.key === 'ArrowRight') this.navigateMenu('right');
        });
    }
}

// ===============================================
// FUNÇÕES GLOBAIS
// ===============================================

function navigateMenu(direction) {
    if (window.dashboard) {
        window.dashboard.navigateMenu(direction);
    }
}

function goToPage(page) {
    console.log(`Função global goToPage chamada: ${page}`);
    window.location.href = page;
}

// ===============================================
// INICIALIZAÇÃO
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard iniciando...');
    window.dashboard = new Dashboard();
});

console.log('✅ Dashboard.js carregado');