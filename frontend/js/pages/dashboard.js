// DASHBOARD - CONDUCTOR PLAYSTATION MENU
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
        this.loadStats();
        this.setupEventListeners();
        this.checkAdminAccess();
        this.setupButtonListeners(); // ← NOVA FUNÇÃO
        
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
                console.log('Botão Perfil clicado!'); // Debug
                this.goToPage('profile.html');
            });
        }

        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Botão Admin clicado!'); // Debug
                this.goToPage('admin.html');
            });
        }

        // Também adicionar aos cards completos
        const profileCard = document.querySelector('[data-page="profile"]');
        const adminCard = document.querySelector('[data-page="admin"]');

        if (profileCard) {
            profileCard.addEventListener('click', () => {
                console.log('Card Perfil clicado!'); // Debug
                this.goToPage('profile.html');
            });
        }

        if (adminCard) {
            adminCard.addEventListener('click', () => {
                console.log('Card Admin clicado!'); // Debug
                this.goToPage('admin.html');
            });
        }
    }

    goToPage(page) {
        console.log(`Navegando para: ${page}`); // Debug
        window.location.href = page;
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.navigateMenu(-1);
            if (e.key === 'ArrowRight') this.navigateMenu(1);
            if (e.key === 'Enter') this.activateCurrentCard();
        });

        // Touch/swipe support (básico)
        let startX = 0;
        const menuTrack = document.getElementById('menuTrack');
        
        if (menuTrack) {
            menuTrack.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            });
            
            menuTrack.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const diff = startX - endX;
                
                if (Math.abs(diff) > 50) {
                    if (diff > 0) this.navigateMenu(1);
                    else this.navigateMenu(-1);
                }
            });
        }
    }

    setupMenuSystem() {
        this.menuCards = document.querySelectorAll('.menu-card');
        this.totalCards = this.menuCards.length;
        
        // Filtrar cards visíveis (remover os que estão display: none)
        this.visibleMenuCards = Array.from(this.menuCards).filter(card => 
            window.getComputedStyle(card).display !== 'none'
        );
        this.totalVisibleCards = this.visibleMenuCards.length;
        
        // Ativar primeiro card
        this.updateMenuDisplay();
        this.updateIndicators();
    }

    navigateMenu(direction) {
        const maxIndex = Math.max(0, this.totalVisibleCards - this.visibleCards);
        
        this.currentMenuIndex += direction;
        
        // Circular navigation
        if (this.currentMenuIndex < 0) {
            this.currentMenuIndex = maxIndex;
        } else if (this.currentMenuIndex > maxIndex) {
            this.currentMenuIndex = 0;
        }
        
        this.updateMenuDisplay();
        this.updateIndicators();
        
        // Feedback sonoro (simulado com vibração em mobile)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    updateMenuDisplay() {
        const menuTrack = document.getElementById('menuTrack');
        if (!menuTrack) return;

        const cardWidth = 380; // 350px + 30px gap
        const offset = -this.currentMenuIndex * cardWidth;
        
        menuTrack.style.transform = `translateX(${offset}px)`;
        
        // Atualizar cards ativos
        this.visibleMenuCards.forEach((card, index) => {
            card.classList.remove('active');
            
            // Cards visíveis na viewport
            if (index >= this.currentMenuIndex && 
                index < this.currentMenuIndex + this.visibleCards) {
                
                // Card central ativo
                if (index === this.currentMenuIndex + Math.floor(this.visibleCards / 2)) {
                    card.classList.add('active');
                }
            }
        });
    }

    updateIndicators() {
        const indicators = document.querySelectorAll('.indicator');
        const maxIndex = Math.max(0, this.totalVisibleCards - this.visibleCards);
        
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active');
            if (index === Math.min(this.currentMenuIndex, maxIndex)) {
                indicator.classList.add('active');
            }
        });
    }

    activateCurrentCard() {
        const activeCard = document.querySelector('.menu-card.active');
        if (activeCard) {
            const button = activeCard.querySelector('button:not(:disabled)');
            if (button) {
                console.log('Ativando card via Enter!'); // Debug
                button.click();
            }
        }
    }

    async checkAdminAccess() {
        const user = authManager.getCurrentUser();
        const adminCard = document.getElementById('adminCard');
        
        if (user && (user.permissao === 'Administrador' || user.permissao === 'Desenvolvedor')) {
            if (adminCard) adminCard.style.display = 'block';
        } else {
            if (adminCard) adminCard.style.display = 'none';
        }
        
        // Reconfigurar menu após mudança
        this.setupMenuSystem();
    }

    loadUserInfo() {
        const user = authManager.getCurrentUser();
        if (user) {
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');
            
            if (userNameEl) userNameEl.textContent = user.nome_usuario;
            if (userRoleEl) {
                userRoleEl.textContent = user.permissao;
                userRoleEl.style.color = authManager.getPermissionColor(user.permissao);
            }
        }
    }

    async loadSystemStatus() {
        try {
            // Testar conectividade da API
            const response = await conductorAPI.get('/auth/test');
            
            if (response) {
                this.updateSystemStatus('online', 'Sistema Online');
                this.updateDbStatus('Conectado');
            }
        } catch (error) {
            this.updateSystemStatus('offline', 'Sistema Offline');
            this.updateDbStatus('Erro de Conexão');
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

    async loadStats() {
        try {
            // Carregar estatísticas reais
            const users = await conductorAPI.get('/users');
            
            if (users && users.data) {
                const totalUsersEl = document.getElementById('totalUsers');
                const usersOnlineEl = document.getElementById('usersOnline');
                
                if (totalUsersEl) totalUsersEl.textContent = users.data.length;
                if (usersOnlineEl) usersOnlineEl.textContent = '1'; // User atual
            }
            
            // Atualizar última atividade
            const lastActivityEl = document.getElementById('lastActivity');
            if (lastActivityEl) lastActivityEl.textContent = 'Agora';
            
            // Estatísticas mockadas por enquanto
            const activeProjectsEl = document.getElementById('activeProjects');
            const systemUptimeEl = document.getElementById('systemUptime');
            const notificationsEl = document.getElementById('notifications');
            
            if (activeProjectsEl) activeProjectsEl.textContent = '3';
            if (systemUptimeEl) systemUptimeEl.textContent = '99.9%';
            if (notificationsEl) notificationsEl.textContent = '0';
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async refreshData() {
        await this.loadSystemStatus();
        await this.loadStats();
        
        // Atualizar timestamp
        const lastActivityEl = document.getElementById('lastActivity');
        if (lastActivityEl) lastActivityEl.textContent = 'Agora';
    }
}

// Funções globais para navegação
function navigateMenu(direction) {
    if (window.dashboard) {
        window.dashboard.navigateMenu(direction);
    }
}

function goToPage(page) {
    console.log(`Função global goToPage chamada: ${page}`); // Debug
    window.location.href = page;
}

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard iniciando...'); // Debug
    window.dashboard = new Dashboard();
});