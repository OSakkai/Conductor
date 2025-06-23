// ADMIN MANAGER - CONDUCTOR (ENDPOINTS CORRIGIDOS)
// Versão corrigida para funcionar com os endpoints reais do backend

class AdminManager {
    constructor() {
        // Verificar dependências críticas
        if (!window.conductorAPI) {
            console.error('❌ ConductorAPI não encontrado!');
            return;
        }
        
        this.api = window.conductorAPI;
        this.authManager = window.authManager;
        
        // Estado do sistema
        this.users = [];
        this.keys = [];
        this.logs = [];
        this.currentEditingUser = null;
        
        // Filtros
        this.userFilters = {
            search: '',
            permission: '',
            status: ''
        };
        this.keyFilters = {
            search: '',
            type: '',
            status: ''
        };
        this.logFilters = {
            search: '',
            type: '',
            date: ''
        };
        
        console.log('✅ AdminManager inicializado');
    }

    // ===============================================
    // INICIALIZAÇÃO E PROTEÇÃO
    // ===============================================

    async init() {
        console.log('🔄 Inicializando sistema de administração...');
        
        try {
            // Verificar autenticação
            if (!this.authManager) {
                console.error('❌ AuthManager não disponível');
                return;
            }

            const hasAccess = await this.authManager.requireAdmin();
            if (!hasAccess) {
                console.error('❌ Acesso negado - não é admin');
                return;
            }

            // Carregar dados iniciais
            await this.loadInitialData();
            
            console.log('✅ Sistema de administração inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showMessage('Erro ao inicializar sistema de administração', 'error');
        }
    }

    async loadInitialData() {
        // Carregar dados em paralelo, mas com tratamento de erro individual
        await Promise.allSettled([
            this.loadUsers(),
            this.loadKeys(),
            this.loadStats()
        ]);
    }

    // ===============================================
    // GESTÃO DE USUÁRIOS
    // ===============================================

    async loadUsers() {
        try {
            console.log('🔄 Carregando usuários...');
            
            const response = await this.api.getUsers();
            
            // ✅ CORREÇÃO: Verificar estrutura da resposta do backend
            if (response && response.data) {
                this.users = Array.isArray(response.data) ? response.data : [];
            } else if (Array.isArray(response)) {
                this.users = response;
            } else {
                console.warn('⚠️ Resposta inesperada da API de usuários:', response);
                this.users = [];
            }
            
            console.log(`✅ ${this.users.length} usuários carregados`, this.users);
            
            this.renderUsersTable();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
            this.users = [];
            this.renderUsersTable();
            this.showMessage('Erro ao carregar usuários: ' + error.message, 'error');
        }
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.error('❌ Tabela de usuários não encontrada');
            return;
        }

        tbody.innerHTML = '';

        if (!this.users || this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--gray-lighter);">
                        Nenhum usuário encontrado
                    </td>
                </tr>
            `;
            return;
        }

        // Aplicar filtros
        const filteredUsers = this.getFilteredUsers();

        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--gray-lighter);">
                        Nenhum usuário encontrado com os filtros aplicados
                    </td>
                </tr>
            `;
            return;
        }

        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            const isActive = user.status === 'ativo';
            
            // ✅ CORREÇÃO: Adaptar campos conforme backend
            const userId = user.id || 'N/A';
            const username = user.nome_usuario || user.username || 'N/A';
            const email = user.email || 'N/A';
            const funcao = user.funcao || 'N/A';
            const permissao = user.permissao || 'Visitante';
            const status = user.status || 'ativo';
            const createdAt = user.data_criacao || user.created_at || user.criado_em;

            row.innerHTML = `
                <td>${userId}</td>
                <td><strong>${username}</strong></td>
                <td>${email}</td>
                <td>${funcao}</td>
                <td>
                    <span class="badge badge-permission-${permissao.toLowerCase()}">
                        ${permissao}
                    </span>
                </td>
                <td>
                    <span class="badge ${isActive ? 'badge-status-ativo' : 'badge-status-inativo'}">
                        ${isActive ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                </td>
                <td>${this.formatDate(createdAt)}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="adminManager.editUser(${userId})" title="Editar usuário">
                            ✏️
                        </button>
                        <button class="btn btn-outline-${isActive ? 'warning' : 'success'} btn-sm" 
                                onclick="adminManager.toggleUserStatus(${userId})"
                                title="${isActive ? 'Desativar' : 'Ativar'} usuário">
                            ${isActive ? '🚫' : '✅'}
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="adminManager.deleteUser(${userId})" title="Excluir usuário">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getFilteredUsers() {
        return this.users.filter(user => {
            const username = user.nome_usuario || user.username || '';
            const email = user.email || '';
            
            const matchesSearch = !this.userFilters.search || 
                username.toLowerCase().includes(this.userFilters.search.toLowerCase()) ||
                email.toLowerCase().includes(this.userFilters.search.toLowerCase());
            
            const matchesPermission = !this.userFilters.permission || 
                user.permissao === this.userFilters.permission;
            
            const matchesStatus = !this.userFilters.status || 
                user.status === this.userFilters.status;

            return matchesSearch && matchesPermission && matchesStatus;
        });
    }

    filterUsers() {
        // Capturar valores dos filtros
        const searchInput = document.getElementById('userSearch');
        const permissionFilter = document.getElementById('permissionFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) this.userFilters.search = searchInput.value;
        if (permissionFilter) this.userFilters.permission = permissionFilter.value;
        if (statusFilter) this.userFilters.status = statusFilter.value;

        // Re-renderizar tabela com filtros
        this.renderUsersTable();
    }

    async createUser(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // ✅ CORREÇÃO: Usar campos corretos conforme backend
            const userData = {
                nome_usuario: formData.get('username'),
                email: formData.get('email'),
                senha: formData.get('password'),
                permissao: formData.get('permissao'),
                funcao: formData.get('funcao') || null
            };

            console.log('🔄 Criando usuário:', userData);

            const response = await this.api.createUser(userData);
            
            if (response && (response.success !== false)) {
                this.showMessage('Usuário criado com sucesso!', 'success');
                this.closeModal('newUserModal');
                await this.loadUsers();
            } else {
                throw new Error(response?.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            this.showMessage('Erro ao criar usuário: ' + error.message, 'error');
        }
    }

    async editUser(userId) {
        try {
            const user = this.users.find(u => u.id == userId);
            if (!user) {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }

            this.currentEditingUser = user;

            // ✅ CORREÇÃO: Usar campos corretos
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUsername').value = user.nome_usuario || user.username || '';
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editPermission').value = user.permissao || 'Visitante';
            document.getElementById('editFuncao').value = user.funcao || '';

            // Mostrar modal Bootstrap
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();

        } catch (error) {
            console.error('❌ Erro ao editar usuário:', error);
            this.showMessage('Erro ao carregar dados do usuário', 'error');
        }
    }

    async updateUser(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            const userId = formData.get('id');
            
            // ✅ CORREÇÃO: Usar campos corretos
            const userData = {
                nome_usuario: formData.get('username'),
                email: formData.get('email'),
                permissao: formData.get('permissao'),
                funcao: formData.get('funcao') || null
            };

            console.log('🔄 Atualizando usuário:', userId, userData);

            const response = await this.api.updateUser(userId, userData);
            
            if (response && (response.success !== false)) {
                this.showMessage('Usuário atualizado com sucesso!', 'success');
                
                // Fechar modal Bootstrap
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
                
                await this.loadUsers();
            } else {
                throw new Error(response?.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar usuário:', error);
            this.showMessage('Erro ao atualizar usuário: ' + error.message, 'error');
        }
    }

    async deleteUser(userId) {
        try {
            const user = this.users.find(u => u.id == userId);
            if (!user) {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }

            const username = user.nome_usuario || user.username || 'usuário';
            if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) {
                return;
            }

            console.log('🔄 Excluindo usuário:', userId);

            await this.api.deleteUser(userId);
            this.showMessage('Usuário excluído com sucesso!', 'success');
            await this.loadUsers();

        } catch (error) {
            console.error('❌ Erro ao excluir usuário:', error);
            this.showMessage('Erro ao excluir usuário: ' + error.message, 'error');
        }
    }

    async toggleUserStatus(userId) {
        try {
            const user = this.users.find(u => u.id == userId);
            if (!user) {
                this.showMessage('Usuário não encontrado', 'error');
                return;
            }

            const newStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
            
            console.log(`🔄 Alterando status do usuário ${userId} para: ${newStatus}`);

            await this.api.updateUser(userId, { status: newStatus });
            this.showMessage(`Usuário ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
            await this.loadUsers();

        } catch (error) {
            console.error('❌ Erro ao alterar status:', error);
            this.showMessage('Erro ao alterar status do usuário', 'error');
        }
    }

    // ===============================================
    // GESTÃO DE CHAVES
    // ===============================================

    async loadKeys() {
        try {
            console.log('🔄 Carregando chaves...');
            
            const response = await this.api.get('/chaves');
            
            // ✅ CORREÇÃO: Verificar estrutura da resposta
            if (response && response.data) {
                this.keys = Array.isArray(response.data) ? response.data : [];
            } else if (Array.isArray(response)) {
                this.keys = response;
            } else {
                console.warn('⚠️ Resposta inesperada da API de chaves:', response);
                this.keys = [];
            }
            
            console.log(`✅ ${this.keys.length} chaves carregadas`, this.keys);
            
            this.renderKeysTable();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar chaves:', error);
            this.keys = [];
            this.renderKeysTable();
            this.showMessage('Erro ao carregar chaves: ' + error.message, 'error');
        }
    }

    renderKeysTable() {
        const tbody = document.getElementById('keysTableBody');
        if (!tbody) {
            console.error('❌ Tabela de chaves não encontrada');
            return;
        }

        tbody.innerHTML = '';

        if (!this.keys || this.keys.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--gray-lighter);">
                        Nenhuma chave encontrada
                    </td>
                </tr>
            `;
            return;
        }

        // Aplicar filtros
        const filteredKeys = this.getFilteredKeys();

        if (filteredKeys.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--gray-lighter);">
                        Nenhuma chave encontrada com os filtros aplicados
                    </td>
                </tr>
            `;
            return;
        }

        filteredKeys.forEach(key => {
            const row = document.createElement('tr');
            
            // Labels de tipo
            const typeLabels = {
                'permanent': '🔑 Permanente',
                'expiring': '⏰ Expirável', 
                'single_use': '1️⃣ Uso Único'
            };

            // ✅ CORREÇÃO: Adaptar campos conforme backend
            const keyCode = key.chave || key.key || 'N/A';
            const keyType = key.tipo || key.type || 'permanent';
            const keyPermission = key.permissao || key.permission || 'Usuario';
            const keyStatus = key.status || 'ativa';
            const createdAt = key.data_criacao || key.created_at;
            const expiresAt = key.data_expiracao || key.expires_at;
            const currentUses = key.usos_atual || key.current_uses || 0;
            const maxUses = key.usos_maximo || key.max_uses;

            // Formatação de expiração
            const expirationDisplay = this.getExpirationDisplay(key);
            const statusDisplay = this.getStatusDisplay(keyStatus, key);
            const usesDisplay = maxUses ? `${currentUses}/${maxUses}` : currentUses;

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <code class="text-warning me-2" title="${keyCode}">
                            ${keyCode.substring(0, 20)}...
                        </code>
                        <button class="btn btn-outline-warning btn-sm" onclick="adminManager.copyKey('${keyCode}')" title="Copiar chave">
                            📋
                        </button>
                    </div>
                </td>
                <td>${typeLabels[keyType] || keyType}</td>
                <td>
                    <span class="badge badge-permission-${keyPermission.toLowerCase()}">
                        ${keyPermission}
                    </span>
                </td>
                <td>${this.formatDate(createdAt)}</td>
                <td>${expirationDisplay}</td>
                <td>${usesDisplay}</td>
                <td>${statusDisplay}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="adminManager.editKey('${key.id || key.chave}')" title="Editar chave">
                            ✏️
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="adminManager.toggleKeyStatus('${key.id || key.chave}')" title="Alterar status">
                            🔄
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="adminManager.deleteKey('${key.id || key.chave}')" title="Excluir chave">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getFilteredKeys() {
        return this.keys.filter(key => {
            const keyCode = key.chave || key.key || '';
            const keyType = key.tipo || key.type || '';
            const keyStatus = key.status || '';

            const matchesSearch = !this.keyFilters.search || 
                keyCode.toLowerCase().includes(this.keyFilters.search.toLowerCase());
            
            const matchesType = !this.keyFilters.type || keyType === this.keyFilters.type;
            const matchesStatus = !this.keyFilters.status || keyStatus === this.keyFilters.status;

            return matchesSearch && matchesType && matchesStatus;
        });
    }

    filterKeys() {
        // Capturar valores dos filtros
        const searchInput = document.getElementById('keySearch');
        const typeFilter = document.getElementById('keyTypeFilter');
        const statusFilter = document.getElementById('keyStatusFilter');

        if (searchInput) this.keyFilters.search = searchInput.value;
        if (typeFilter) this.keyFilters.type = typeFilter.value;
        if (statusFilter) this.keyFilters.status = statusFilter.value;

        // Re-renderizar tabela com filtros
        this.renderKeysTable();
    }

    async createKey(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            const keyData = {
                tipo: formData.get('tipo'),
                permissao: formData.get('permissao'),
                descricao: formData.get('descricao') || null
            };

            // Adicionar campos condicionais
            if (keyData.tipo === 'expiring') {
                keyData.data_expiracao = formData.get('data_expiracao');
            }
            
            if (formData.get('usos_maximo')) {
                keyData.usos_maximo = parseInt(formData.get('usos_maximo'));
            }

            console.log('🔄 Criando chave:', keyData);

            const response = await this.api.post('/chaves', keyData);
            
            if (response && (response.success !== false)) {
                this.showMessage('Chave criada com sucesso!', 'success');
                
                // Fechar modal Bootstrap
                const modal = bootstrap.Modal.getInstance(document.getElementById('newKeyModal'));
                modal.hide();
                
                await this.loadKeys();
            } else {
                throw new Error(response?.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro ao criar chave:', error);
            this.showMessage('Erro ao criar chave: ' + error.message, 'error');
        }
    }

    async copyKey(keyCode) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(keyCode);
                this.showMessage('Chave copiada para a área de transferência!', 'success');
            } else {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = keyCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showMessage('Chave copiada!', 'success');
            }
        } catch (error) {
            console.error('❌ Erro ao copiar chave:', error);
            this.showMessage('Erro ao copiar chave', 'error');
        }
    }

    getExpirationDisplay(key) {
        const expiresAt = key.data_expiracao || key.expires_at;
        
        if (!expiresAt) {
            return '<span class="text-muted">Nunca</span>';
        }

        const expirationDate = new Date(expiresAt);
        const now = new Date();
        const isExpired = now > expirationDate;

        if (isExpired) {
            return `<span class="text-danger">⚠️ ${this.formatDate(expiresAt)}</span>`;
        } else {
            return `<span class="text-success">${this.formatDate(expiresAt)}</span>`;
        }
    }

    getStatusDisplay(status, key) {
        const statusMap = {
            'ativa': '<span class="badge bg-success">✅ Ativa</span>',
            'expirada': '<span class="badge bg-warning">⚠️ Expirada</span>',
            'usada': '<span class="badge bg-secondary">✔️ Usada</span>',
            'inativa': '<span class="badge bg-danger">❌ Inativa</span>'
        };

        return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
    }

    // ===============================================
    // GESTÃO DE LOGS
    // ===============================================

    async loadLogs() {
        try {
            console.log('🔄 Carregando logs...');
            
            // ✅ CORREÇÃO: Como não temos endpoint de logs ainda, usar dados mock
            this.logs = this.generateMockLogs();
            
            console.log(`✅ ${this.logs.length} logs carregados`);
            
            this.renderLogsTable();
            
        } catch (error) {
            console.error('❌ Erro ao carregar logs:', error);
            this.logs = [];
            this.renderLogsTable();
            this.showMessage('Erro ao carregar logs', 'error');
        }
    }

    generateMockLogs() {
        // Logs de exemplo baseados nos usuários carregados
        const now = new Date();
        const logs = [];
        
        // Log de login do usuário atual
        const currentUser = this.authManager.getCurrentUser();
        if (currentUser) {
            logs.push({
                id: 1,
                timestamp: new Date(now - 1800000).toISOString(),
                type: 'auth',
                user: currentUser.nome_usuario || currentUser.username,
                action: 'login',
                details: 'Login realizado com sucesso',
                ip: '192.168.1.100'
            });
        }
        
        // Logs baseados nas ações recentes
        this.users.forEach((user, index) => {
            logs.push({
                id: logs.length + 1,
                timestamp: new Date(now - (3600000 * (index + 1))).toISOString(),
                type: 'user',
                user: 'admin',
                action: 'view_user',
                details: `Visualizou perfil de ${user.nome_usuario || user.username}`,
                ip: '192.168.1.100'
            });
        });
        
        return logs.slice(0, 10); // Limitar a 10 logs mais recentes
    }

    renderLogsTable() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) {
            console.error('❌ Tabela de logs não encontrada');
            return;
        }

        tbody.innerHTML = '';

        if (!this.logs || this.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--gray-lighter);">
                        Nenhum log encontrado
                    </td>
                </tr>
            `;
            return;
        }

        // Aplicar filtros
        const filteredLogs = this.getFilteredLogs();

        filteredLogs.forEach(log => {
            const row = document.createElement('tr');
            
            // Ícones por tipo
            const typeIcons = {
                'auth': '🔐',
                'user': '👤',
                'key': '🔑',
                'system': '⚙️'
            };

            const timestamp = log.timestamp || log.created_at;
            const type = log.type || 'system';
            const user = log.user || log.username || 'Sistema';
            const action = log.action || 'N/A';
            const details = log.details || log.description || 'N/A';
            const ip = log.ip || log.ip_address || 'N/A';

            row.innerHTML = `
                <td>${this.formatDateTime(timestamp)}</td>
                <td>
                    <span class="badge bg-info">
                        ${typeIcons[type] || '📝'} ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                </td>
                <td><strong>${user}</strong></td>
                <td>${this.getActionName(action)}</td>
                <td>${details}</td>
                <td><code>${ip}</code></td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getFilteredLogs() {
        return this.logs.filter(log => {
            const searchTerm = this.logFilters.search.toLowerCase();
            const matchesSearch = !searchTerm || 
                (log.user && log.user.toLowerCase().includes(searchTerm)) ||
                (log.action && log.action.toLowerCase().includes(searchTerm)) ||
                (log.details && log.details.toLowerCase().includes(searchTerm));
            
            const matchesType = !this.logFilters.type || log.type === this.logFilters.type;
            
            const matchesDate = !this.logFilters.date || 
                (log.timestamp && log.timestamp.startsWith(this.logFilters.date));

            return matchesSearch && matchesType && matchesDate;
        });
    }

    filterLogs() {
        // Capturar valores dos filtros
        const searchInput = document.getElementById('logSearch');
        const typeFilter = document.getElementById('logTypeFilter');
        const dateFilter = document.getElementById('logDateFilter');

        if (searchInput) this.logFilters.search = searchInput.value;
        if (typeFilter) this.logFilters.type = typeFilter.value;
        if (dateFilter) this.logFilters.date = dateFilter.value;

        // Re-renderizar tabela com filtros
        this.renderLogsTable();
    }

    // ===============================================
    // ESTATÍSTICAS E DASHBOARD
    // ===============================================

    async loadStats() {
        try {
            // ✅ CORREÇÃO: Como endpoint /api/system/stats não existe, calcular localmente
            const stats = this.calculateLocalStats();
            this.updateStatsDisplay(stats);

        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    calculateLocalStats() {
        const totalUsers = this.users.length;
        const activeKeys = this.keys.filter(k => k.status === 'ativa').length;
        const expiredKeys = this.keys.filter(k => k.status === 'expirada').length;
        const usedKeys = this.keys.filter(k => k.status === 'usada').length;

        return {
            totalUsers,
            totalKeys: activeKeys,
            expiredKeys,
            usedKeys
        };
    }

    updateStats() {
        const stats = this.calculateLocalStats();
        this.updateStatsDisplay(stats);
    }

    updateStatsDisplay(stats) {
        // Atualizar cards de estatísticas
        const totalUsersEl = document.getElementById('totalUsers');
        const totalKeysEl = document.getElementById('totalKeys');
        const expiredKeysEl = document.getElementById('expiredKeys');
        const usedKeysEl = document.getElementById('usedKeys');

        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
        if (totalKeysEl) totalKeysEl.textContent = stats.totalKeys || 0;
        if (expiredKeysEl) expiredKeysEl.textContent = stats.expiredKeys || 0;
        if (usedKeysEl) usedKeysEl.textContent = stats.usedKeys || 0;
    }

    // ===============================================
    // UTILITÁRIOS
    // ===============================================

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    getActionName(action) {
        const actionNames = {
            'login': 'Login realizado',
            'logout': 'Logout realizado',
            'create_user': 'Usuário criado',
            'update_user': 'Usuário atualizado',
            'delete_user': 'Usuário excluído',
            'view_user': 'Usuário visualizado',
            'create_key': 'Chave criada',
            'update_key': 'Chave atualizada',
            'delete_key': 'Chave excluída',
            'use_key': 'Chave utilizada',
            'system_check': 'Verificação do sistema',
            'export_keys': 'Relatório exportado'
        };

        return actionNames[action] || action;
    }

    showMessage(message, type = 'info') {
        // Sistema de mensagens usando Bootstrap Toast
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${this.getBootstrapType(type)} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${this.getToastIcon(type)} ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        // Adicionar ao container
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(container);
        }

        container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = container.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Auto-remover após esconder
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        // Log no console
        console.log(`${this.getToastIcon(type)} [${type.toUpperCase()}] ${message}`);
    }

    getBootstrapType(type) {
        const typeMap = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return typeMap[type] || 'info';
    }

    getToastIcon(type) {
        const iconMap = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return iconMap[type] || iconMap['info'];
    }

    closeModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) {
            modal.hide();
        }
    }

    // ===============================================
    // MÉTODOS AUXILIARES PARA CHAVES
    // ===============================================

    async editKey(keyId) {
        // Implementar edição de chaves (futuro)
        this.showMessage('Edição de chaves será implementada em breve', 'info');
    }

    async toggleKeyStatus(keyId) {
        try {
            const key = this.keys.find(k => (k.id || k.chave) == keyId);
            if (!key) {
                this.showMessage('Chave não encontrada', 'error');
                return;
            }

            const newStatus = key.status === 'ativa' ? 'inativa' : 'ativa';
            
            console.log(`🔄 Alterando status da chave ${keyId} para: ${newStatus}`);

            // Implementar no backend
            await this.api.put(`/chaves/${keyId}`, { status: newStatus });
            this.showMessage(`Chave ${newStatus === 'ativa' ? 'ativada' : 'desativada'} com sucesso!`, 'success');
            await this.loadKeys();

        } catch (error) {
            console.error('❌ Erro ao alterar status da chave:', error);
            this.showMessage('Erro ao alterar status da chave', 'error');
        }
    }

    async deleteKey(keyId) {
        try {
            const key = this.keys.find(k => (k.id || k.chave) == keyId);
            if (!key) {
                this.showMessage('Chave não encontrada', 'error');
                return;
            }

            const keyCode = key.chave || key.key || keyId;
            if (!confirm(`Tem certeza que deseja excluir a chave "${keyCode.substring(0, 20)}..."?`)) {
                return;
            }

            console.log('🔄 Excluindo chave:', keyId);

            await this.api.delete(`/chaves/${keyId}`);
            this.showMessage('Chave excluída com sucesso!', 'success');
            await this.loadKeys();

        } catch (error) {
            console.error('❌ Erro ao excluir chave:', error);
            this.showMessage('Erro ao excluir chave: ' + error.message, 'error');
        }
    }
}

// ===============================================
// INICIALIZAÇÃO GLOBAL
// ===============================================

// Instância global do AdminManager
window.adminManager = new AdminManager();

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM carregado, inicializando AdminManager...');
    
    // Verificar se todas as dependências estão disponíveis
    if (!window.conductorAPI) {
        console.error('❌ ConductorAPI não encontrado');
        return;
    }
    
    if (!window.authManager) {
        console.error('❌ AuthManager não encontrado');
        return;
    }
    
    // Inicializar AdminManager
    window.adminManager.init();
});

console.log('✅ AdminManager carregado e pronto!');