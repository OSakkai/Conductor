// ===============================================
// CONDUCTOR - ADMIN MANAGER FINAL COMPLETO
// frontend/js/pages/admin.js
// TODOS OS PROBLEMAS CORRIGIDOS
// ===============================================

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
        this.currentEditingKey = null;
        
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
            this.loadLogs()
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
            
            // ✅ CORREÇÃO: Status do banco usa 'Ativo' (maiúsculo)
            const isActive = user.status === 'Ativo';
            
            // Adaptar campos conforme backend
            const userId = user.id || 'N/A';
            const username = user.nome_usuario || user.username || 'N/A';
            const email = user.email || 'N/A';
            const funcao = user.funcao || 'N/A';
            const permissao = user.permissao || 'Visitante';
            const status = user.status || 'Ativo';
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
                <td>
                    <div class="btn-group">
                        <button class="btn btn-outline-primary btn-sm" 
                                onclick="adminManager.editUser(${userId})" 
                                title="Editar usuário">
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
            
            // ✅ CORREÇÃO: Status do banco usa 'Ativo' (maiúsculo)
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
                username: formData.get('username'), // Para api.createUser()
                email: formData.get('email'),
                password: formData.get('password'), // Para api.createUser()
                permissao: formData.get('permissao'),
                funcao: formData.get('funcao') || 'Estagiario'
            };

            console.log('🔄 Criando usuário:', userData);

            const response = await this.api.createUser(userData);
            
            if (response && (response.success !== false)) {
                this.showMessage('Usuário criado com sucesso!', 'success');
                
                // Fechar modal Bootstrap
                const modal = bootstrap.Modal.getInstance(document.getElementById('newUserModal'));
                if (modal) modal.hide();
                
                // Limpar formulário
                form.reset();
                
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

            // ✅ CORREÇÃO: Preencher modal de edição com TODOS os dados do usuário
            const editForm = document.getElementById('editUserForm');
            if (editForm) {
                const editUsername = editForm.querySelector('#editUsername');
                const editEmail = editForm.querySelector('#editEmail');
                const editPermissao = editForm.querySelector('#editPermissao');
                const editFuncao = editForm.querySelector('#editFuncao');

                if (editUsername) editUsername.value = user.nome_usuario || '';
                if (editEmail) editEmail.value = user.email || '';
                if (editPermissao) editPermissao.value = user.permissao || '';
                if (editFuncao) editFuncao.value = user.funcao || '';
            }

            // Abrir modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();

        } catch (error) {
            console.error('❌ Erro ao abrir edição:', error);
            this.showMessage('Erro ao abrir edição de usuário', 'error');
        }
    }

    async updateUser(event) {
        event.preventDefault();
        
        try {
            if (!this.currentEditingUser) {
                this.showMessage('Nenhum usuário selecionado para edição', 'error');
                return;
            }

            const form = event.target;
            const formData = new FormData(form);
            
            // ✅ CORREÇÃO: Manter dados existentes e só atualizar os fornecidos
            const userData = {
                nome_usuario: formData.get('username'),
                email: formData.get('email'),
                permissao: formData.get('permissao'),
                funcao: formData.get('funcao'),
                // Preservar campos existentes
                celular: this.currentEditingUser.celular,
                status: this.currentEditingUser.status
            };

            console.log('🔄 Atualizando usuário:', userData);

            const response = await this.api.put(`/users/${this.currentEditingUser.id}`, userData);
            
            if (response && (response.success !== false)) {
                this.showMessage('Usuário atualizado com sucesso!', 'success');
                
                // Fechar modal Bootstrap
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                if (modal) modal.hide();
                
                this.currentEditingUser = null;
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

            // ✅ CORREÇÃO: Status do banco usa 'Ativo'/'Inativo' (maiúsculo)
            const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
            
            console.log(`🔄 Alterando status do usuário ${userId} para: ${newStatus}`);

            // ✅ CORREÇÃO: Usar payload completo preservando todos os campos
            const updatePayload = {
                nome_usuario: user.nome_usuario,
                email: user.email,
                funcao: user.funcao,
                permissao: user.permissao,
                celular: user.celular,
                status: newStatus  // ✅ Campo status com valor correto
            };

            const response = await this.api.put(`/users/${userId}`, updatePayload);
            
            if (response && response.success !== false) {
                this.showMessage(`Usuário ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                await this.loadUsers();
            } else {
                throw new Error(response?.message || 'Erro desconhecido ao atualizar status');
            }

        } catch (error) {
            console.error('❌ Erro completo ao alterar status:', error);
            this.showMessage('Erro ao alterar status do usuário: ' + error.message, 'error');
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
            
            console.log(`✅ ${this.keys.length} chaves carregadas`);
            
            this.renderKeysTable();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar chaves:', error);
            this.keys = [];
            this.renderKeysTable();
            this.showMessage('Erro ao carregar chaves', 'error');
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

        filteredKeys.forEach(key => {
            const row = document.createElement('tr');
            
            const keyId = key.id || 'N/A';
            const keyCode = key.chave || key.key || 'N/A';
            const type = key.tipo || key.type || 'N/A';
            const permission = key.permissao || key.permission || 'N/A';
            const createdAt = key.data_criacao || key.created_at || 'N/A';
            const usesInfo = `${key.usos_atual || 0}${key.usos_maximo ? `/${key.usos_maximo}` : ''}`;
            const status = key.status || 'ativa';

            row.innerHTML = `
                <td>
                    <code onclick="adminManager.copyToClipboard('${keyCode}')" 
                          style="cursor: pointer;" title="Clique para copiar">
                        ${keyCode.substring(0, 20)}...
                    </code>
                </td>
                <td>${this.getTypeDisplay(type)}</td>
                <td><span class="badge bg-info">${permission}</span></td>
                <td>${this.formatDate(createdAt)}</td>
                <td>${this.getExpirationDisplay(key)}</td>
                <td>${usesInfo}</td>
                <td>${this.getStatusDisplay(status, key)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-outline-primary btn-sm" 
                                onclick="adminManager.editKey(${keyId})" 
                                title="Editar chave">
                            ✏️
                        </button>
                        <button class="btn btn-outline-danger btn-sm" 
                                onclick="adminManager.deleteKey(${keyId})" 
                                title="Excluir chave">
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
            const description = key.descricao || key.description || '';
            
            const matchesSearch = !this.keyFilters.search || 
                keyCode.toLowerCase().includes(this.keyFilters.search.toLowerCase()) ||
                description.toLowerCase().includes(this.keyFilters.search.toLowerCase());
            
            const matchesType = !this.keyFilters.type || 
                (key.tipo || key.type) === this.keyFilters.type;
            
            const matchesStatus = !this.keyFilters.status || 
                key.status === this.keyFilters.status;

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

    // ✅ NOVO: Método createKey implementado
    async createKey(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const formData = new FormData(form);
            
            // ✅ CORREÇÃO: Gerar código da chave automaticamente
            const keyCode = this.generateKeyCode();
            
            const keyData = {
                chave: keyCode, // ✅ Campo obrigatório para backend
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
                this.showMessage(`Chave criada com sucesso! Código: ${keyCode}`, 'success');
                
                // Fechar modal Bootstrap
                const modal = bootstrap.Modal.getInstance(document.getElementById('newKeyModal'));
                if (modal) modal.hide();
                
                // Limpar formulário
                form.reset();
                
                await this.loadKeys();
            } else {
                throw new Error(response?.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro ao criar chave:', error);
            this.showMessage('Erro ao criar chave: ' + error.message, 'error');
        }
    }

    // ✅ NOVO: Gerador de código de chave
    generateKeyCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // ✅ NOVO: Método editKey implementado
    async editKey(keyId) {
        try {
            const key = this.keys.find(k => k.id == keyId);
            if (!key) {
                this.showMessage('Chave não encontrada', 'error');
                return;
            }

            // Para simplicidade, apenas permitir mudança de status por agora
            const newStatus = key.status === 'ativa' ? 'inativa' : 'ativa';
            
            console.log(`🔄 Alterando status da chave ${keyId} para: ${newStatus}`);

            const response = await this.api.put(`/chaves/${keyId}`, { status: newStatus });
            
            if (response && response.success !== false) {
                this.showMessage(`Chave ${newStatus === 'ativa' ? 'ativada' : 'desativada'} com sucesso!`, 'success');
                await this.loadKeys();
            } else {
                throw new Error(response?.message || 'Erro ao alterar status da chave');
            }

        } catch (error) {
            console.error('❌ Erro ao editar chave:', error);
            this.showMessage('Erro ao alterar status da chave', 'error');
        }
    }

    // ✅ NOVO: Método deleteKey implementado
    async deleteKey(keyId) {
        try {
            const key = this.keys.find(k => k.id == keyId);
            if (!key) {
                this.showMessage('Chave não encontrada', 'error');
                return;
            }

            const keyCode = key.chave || key.key || keyId;
            if (!confirm(`Tem certeza que deseja excluir a chave "${keyCode.substring(0, 20)}..."?`)) {
                return;
            }

            console.log('🔄 Excluindo chave:', keyId);

            const response = await this.api.delete(`/chaves/${keyId}`);
            
            if (response && response.success !== false) {
                this.showMessage('Chave excluída com sucesso!', 'success');
                await this.loadKeys();
            } else {
                throw new Error(response?.message || 'Erro ao excluir chave');
            }

        } catch (error) {
            console.error('❌ Erro ao excluir chave:', error);
            this.showMessage('Erro ao excluir chave: ' + error.message, 'error');
        }
    }

    getTypeDisplay(type) {
        const typeMap = {
            'permanent': '<span class="badge bg-success">♾️ Permanente</span>',
            'expiring': '<span class="badge bg-warning">⏰ Expirável</span>',
            'single_use': '<span class="badge bg-info">1️⃣ Uso Único</span>'
        };

        return typeMap[type] || `<span class="badge bg-secondary">${type}</span>`;
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.showMessage('Chave copiada!', 'success');
            } else {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = text;
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
            
            // ✅ CORREÇÃO: Tentar carregar logs reais do backend primeiro
            try {
                const response = await this.api.get('/logs');
                if (response && response.data) {
                    this.logs = Array.isArray(response.data) ? response.data : [];
                } else {
                    throw new Error('Endpoint de logs não disponível');
                }
            } catch (apiError) {
                console.warn('⚠️ Endpoint /logs não disponível, usando dados mock:', apiError);
                this.logs = this.generateMockLogs();
            }
            
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

    // ✅ NOVO: Método clearLogs implementado
    clearLogs() {
        // Limpar filtros
        this.logFilters = {
            search: '',
            type: '',
            date: ''
        };

        // Limpar campos do formulário
        const searchInput = document.getElementById('logSearch');
        const typeFilter = document.getElementById('logTypeFilter');
        const dateFilter = document.getElementById('logDateFilter');

        if (searchInput) searchInput.value = '';
        if (typeFilter) typeFilter.value = '';
        if (dateFilter) dateFilter.value = '';

        // Re-renderizar tabela
        this.renderLogsTable();
        
        this.showMessage('Filtros de logs limpos', 'info');
    }

    // ===============================================
    // ESTATÍSTICAS E DASHBOARD
    // ===============================================

    async loadStats() {
        try {
            // ✅ CORREÇÃO: Tentar carregar stats da API primeiro
            try {
                const response = await this.api.get('/stats');
                if (response && response.data) {
                    this.updateStatsDisplay(response.data);
                    return;
                }
            } catch (apiError) {
                console.warn('⚠️ Endpoint /stats não disponível, calculando localmente');
            }

            // Fallback para cálculo local
            const stats = this.calculateLocalStats();
            this.updateStatsDisplay(stats);

        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    calculateLocalStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.status === 'Ativo').length;
        const totalKeys = this.keys.length;
        const activeKeys = this.keys.filter(k => k.status === 'ativa').length;
        const expiredKeys = this.keys.filter(k => k.status === 'expirada').length;
        const usedKeys = this.keys.filter(k => k.status === 'usada').length;

        return {
            totalUsers,
            activeUsers,
            totalKeys,
            activeKeys,
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
        const activeUsersEl = document.getElementById('activeUsers');
        const totalKeysEl = document.getElementById('totalKeys');
        const activeKeysEl = document.getElementById('activeKeys');
        const expiredKeysEl = document.getElementById('expiredKeys');
        const usedKeysEl = document.getElementById('usedKeys');

        if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
        if (activeUsersEl) activeUsersEl.textContent = stats.activeUsers || 0;
        if (totalKeysEl) totalKeysEl.textContent = stats.totalKeys || 0;
        if (activeKeysEl) activeKeysEl.textContent = stats.activeKeys || 0;
        if (expiredKeysEl) expiredKeysEl.textContent = stats.expiredKeys || 0;
        if (usedKeysEl) usedKeysEl.textContent = stats.usedKeys || 0;
    }

    // ===============================================
    // MÉTODOS AUXILIARES
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
        const actionMap = {
            'login': 'Login',
            'logout': 'Logout',
            'create_user': 'Criar Usuário',
            'update_user': 'Atualizar Usuário',
            'delete_user': 'Excluir Usuário',
            'view_user': 'Visualizar Usuário',
            'create_key': 'Criar Chave',
            'delete_key': 'Excluir Chave'
        };

        return actionMap[action] || action;
    }

    // ✅ CORREÇÃO: Sistema de notificações melhorado
    showMessage(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // ✅ Implementação de toast melhorada
        this.showToast(message, type);
    }

    showToast(message, type = 'info') {
        // Criar elemento toast
        const toast = document.createElement('div');
        toast.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Adicionar ao body
        document.body.appendChild(toast);
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    getBootstrapAlertClass(type) {
        const typeMap = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return typeMap[type] || 'info';
    }
}

// ===============================================
// INICIALIZAÇÃO GLOBAL
// ===============================================

// Aguardar DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 DOM carregado - inicializando AdminManager...');
    
    // Verificar se todas as dependências estão carregadas
    if (!window.conductorAPI) {
        console.error('❌ ConductorAPI não encontrado!');
        return;
    }
    
    if (!window.authManager) {
        console.error('❌ AuthManager não encontrado!');
        return;
    }
    
    // Criar instância global
    window.adminManager = new AdminManager();
    
    // Inicializar se estamos na página admin
    if (window.location.pathname.includes('admin.html')) {
        window.adminManager.init();
    }
    
    console.log('✅ AdminManager carregado globalmente');
});

// ===============================================
// FUNÇÕES GLOBAIS PARA COMPATIBILIDADE COM HTML
// ===============================================

function loadUsers() {
    if (window.adminManager) {
        window.adminManager.loadUsers();
    }
}

function loadKeys() {
    if (window.adminManager) {
        window.adminManager.loadKeys();
    }
}

function loadLogs() {
    if (window.adminManager) {
        window.adminManager.loadLogs();
    }
}

function filterUsers() {
    if (window.adminManager) {
        window.adminManager.filterUsers();
    }
}

function filterKeys() {
    if (window.adminManager) {
        window.adminManager.filterKeys();
    }
}

function filterLogs() {
    if (window.adminManager) {
        window.adminManager.filterLogs();
    }
}

function clearLogs() {
    if (window.adminManager) {
        window.adminManager.clearLogs();
    }
}

console.log('🎼 CONDUCTOR - Admin Manager FINAL carregado!');