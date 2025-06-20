// ADMIN PAGE CONTROLLER
class AdminManager {
    constructor() {
        this.users = [];
        this.keys = [];
        this.logs = [];
        this.currentTab = 'users';
        this.init();
    }

    async init() {
        // Proteger página (requer Admin ou Dev)
        const isAuth = await protectPage();
        if (!isAuth) return;

        // Verificar se é Admin ou Dev
        const user = authManager.getCurrentUser();
        if (!user || (user.permissao !== 'Administrador' && user.permissao !== 'Desenvolvedor')) {
            alert('Acesso negado! Apenas Administradores e Desenvolvedores podem acessar esta página.');
            window.location.href = 'dashboard.html';
            return;
        }

        this.loadData();
        this.setupEventListeners();
    }

    // 🆕 SISTEMA DE LOGS
// 🆕 SISTEMA DE LOGS
    async addLog(action, details, targetUser = null) {
        const currentUser = authManager.getCurrentUser();
        
        const logData = {
            usuario_id: currentUser?.id || null,
            acao: action,
            detalhes: details,
            usuario_alvo: targetUser,
            ip_address: '192.168.1.100', // Por enquanto fixo
            user_agent: navigator.userAgent
        };

        try {
            // Usar a instância global correta
            const response = await window.conductorAPI.post('/logs', logData);
            console.log('✅ Log salvo com sucesso:', response); // Debug
            
            // Recarregar logs para mostrar na interface
            if (this.currentTab === 'logs') {
                await this.loadLogs();
            }
            
            // Atualizar estatísticas
            this.updateStats();
        } catch (error) {
            console.error('❌ Erro ao salvar log:', error);
            
            // Fallback: manter log local se API falhar
            const newLog = {
                id: Date.now(),
                acao: action,
                usuario: currentUser ? currentUser.nome_usuario : 'Sistema',
                usuario_alvo: targetUser,
                detalhes: details,
                data_criacao: new Date().toISOString(),
                ip_address: logData.ip_address
            };
            
            this.logs.unshift(newLog);
            if (this.logs.length > 100) {
                this.logs = this.logs.slice(0, 100);
            }
            
            // Re-renderizar logs se estiver na aba de logs
            if (this.currentTab === 'logs') {
                this.renderLogs();
            }
        }
    }

    async loadData() {
        await this.loadUsers();
        await this.loadKeys();
        await this.loadLogs();
        this.updateStats();
    }

    setupEventListeners() {
        // Formulários
        document.getElementById('newUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        document.getElementById('newKeyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createKey();
        });

        document.getElementById('editUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUser();
        });

        // Modals
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    async loadUsers() {
        try {
            const response = await conductorAPI.get('/users');
            if (response && response.data) {
                this.users = response.data;
                this.renderUsersTable();
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.showMessage('Erro ao carregar usuários', 'error');
        }
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const row = document.createElement('tr');
            const isActive = user.status === 'Ativo';
            const statusClass = isActive ? 'ativo' : 'inativo';
            
            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.nome_usuario}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.funcao || 'N/A'}</td>
                <td><span class="permission-badge permission-${user.permissao.toLowerCase()}">${user.permissao}</span></td>
                <td><span class="user-status status-${statusClass}">${user.status}</span></td>
                <td>${this.formatDate(user.ultimo_login) || 'Nunca'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser(${user.id})">✏️ Editar</button>
                        ${user.permissao !== 'Desenvolvedor' ? `
                            <button class="btn-sm btn-promote" onclick="adminManager.promoteUser(${user.id})">⬆️ Promover</button>
                            <button class="btn-sm btn-demote" onclick="adminManager.demoteUser(${user.id})">⬇️ Rebaixar</button>
                        ` : ''}
                        <button class="btn-sm ${isActive ? 'btn-disable' : 'btn-enable'}" 
                                onclick="adminManager.toggleUserStatus(${user.id})">
                            ${isActive ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadKeys() {
        try {
            const response = await conductorAPI.get('/chaves');
            if (response && response.data) {
                this.keys = response.data;
            } else {
                // Se não há endpoint ainda, manter dados mockados
                this.keys = [
                    {
                        id: 1,
                        chave: 'COND-PERM-ADM-2025-ABC123',
                        tipo: 'permanent',
                        permissao: 'Administrador',
                        data_criacao: new Date().toISOString(),
                        data_expiracao: null,
                        usos_atual: 0,
                        usos_maximo: null,
                        status: 'ativa',
                        descricao: 'Chave para novos administradores',
                        criado_por: 'Sistema'
                    }
                ];
            }
            this.renderKeysTable();
        } catch (error) {
            console.error('Erro ao carregar chaves:', error);
            // Fallback para dados mockados
            this.keys = [];
            this.renderKeysTable();
        }
    }

    renderKeysTable() {
        const tbody = document.getElementById('keysTableBody');
        tbody.innerHTML = '';

        // 🔧 VERIFICAR SE HÁ CHAVES
        if (!this.keys || this.keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--gray-lighter);">Nenhuma chave encontrada</td></tr>';
            return;
        }

        this.keys.forEach(key => {
            const row = document.createElement('tr');
            const typeLabels = {
                'permanent': '🔑 Permanente',
                'expiring': '⏰ Expirável',
                'single_use': '1️⃣ Uso Único'
            };

            // 🔧 VERIFICAÇÕES DE SEGURANÇA
            const keyType = key.tipo || key.type || 'permanent';
            const keyPermission = key.permissao || key.permission || 'Usuario';
            const keyStatus = key.status || 'ativa';
            const keyChave = key.chave || key.key || 'N/A';

            console.log('Renderizando chave:', { keyType, keyPermission, keyStatus, keyChave }); // Debug

            row.innerHTML = `
                <td><code>${keyChave}</code></td>
                <td>${typeLabels[keyType] || keyType}</td>
                <td><span class="permission-badge permission-${keyPermission.toLowerCase()}">${keyPermission}</span></td>
                <td>${this.formatDate(key.data_criacao || key.created_at)}</td>
                <td>${key.data_expiracao ? this.formatDate(key.data_expiracao) : 'Nunca'}</td>
                <td>${key.usos_atual || 0}${key.usos_maximo ? `/${key.usos_maximo}` : ''}</td>
                <td><span class="user-status status-${keyStatus === 'ativa' ? 'ativo' : 'inativo'}">${keyStatus === 'ativa' ? 'Ativa' : 'Inativa'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.copyKey('${keyChave}')">📋 Copiar</button>
                        ${keyStatus === 'ativa' ? `
                            <button class="btn-sm btn-disable" onclick="adminManager.deactivateKey(${key.id})">🚫 Desativar</button>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadLogs() {
        try {
            const response = await conductorAPI.get('/logs');
            if (response && response.data) {
                this.logs = response.data;
            } else {
                // Se não há endpoint ainda, manter dados iniciais
                this.logs = [
                    {
                        id: 1,
                        acao: 'admin_access',
                        usuario: authManager.getCurrentUser()?.nome_usuario || 'Admin',
                        usuario_alvo: null,
                        detalhes: 'Acesso ao painel de administração',
                        data_criacao: new Date().toISOString(),
                        ip_address: '192.168.1.100'
                    }
                ];
            }
            this.renderLogs();
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            this.logs = [];
            this.renderLogs();
        }
    }

    renderLogs() {
        const container = document.getElementById('logsContainer');
        container.innerHTML = '';

        const actionIcons = {
            'login': '🔑',
            'logout': '🚪',
            'user_created': '👤',
            'user_updated': '✏️',
            'user_promoted': '⬆️',
            'user_demoted': '⬇️',
            'user_activated': '✅',
            'user_deactivated': '🚫',
            'permission_changed': '🛡️',
            'key_created': '🔑',
            'key_copied': '📋',
            'key_deactivated': '🚫',
            'admin_access': '🔧',
            'system_start': '⚡'
        };

        this.logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            
            // Usar os campos corretos da tabela logs_sistema
            const usuario = log.usuario?.nome_usuario || log.usuario || 'Sistema';
            const timestamp = log.data_criacao || log.timestamp;
            const ip = log.ip_address || log.ip || 'N/A';
            
            logItem.innerHTML = `
                <div class="log-icon">${actionIcons[log.acao] || '📋'}</div>
                <div class="log-content">
                    <div class="log-action">${log.detalhes}</div>
                    <div class="log-details">Por: ${usuario}${log.usuario_alvo ? ` • Usuário: ${log.usuario_alvo}` : ''} • IP: ${ip}</div>
                </div>
                <div class="log-time">${this.formatDate(timestamp)}</div>
            `;
            container.appendChild(logItem);
        });
    }

    updateStats() {
        // Estatísticas de usuários
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('adminUsers').textContent = this.users.filter(u => 
            u.permissao === 'Administrador' || u.permissao === 'Desenvolvedor'
        ).length;

        // Estatísticas de chaves
        document.getElementById('totalKeys').textContent = this.keys.filter(k => k.status === 'active').length;
        document.getElementById('permanentKeys').textContent = this.keys.filter(k => k.type === 'permanent').length;
        document.getElementById('expiringKeys').textContent = this.keys.filter(k => k.type === 'expiring').length;
        document.getElementById('oneTimeKeys').textContent = this.keys.filter(k => k.type === 'single_use').length;
        document.getElementById('usedKeys').textContent = this.keys.filter(k => k.status === 'used').length;

        // Estatísticas de atividade
        document.getElementById('todayActions').textContent = this.logs.length;
    }

    // Modal Functions
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // User Management COM LOGS
    async createUser() {
        const formData = new FormData(document.getElementById('newUserForm'));
        const userData = Object.fromEntries(formData);

        const backendData = {
            nome_usuario: userData.username,
            email: userData.email,
            celular: userData.phone,
            funcao: userData.function,
            permissao: userData.permission,
            senha: userData.password
        };

        try {
            const response = await conductorAPI.post('/users', backendData);
            
            if (response && response.message) {
                // 📋 LOG DA AÇÃO
                this.addLog('user_created', `Novo usuário criado: ${userData.username} (${userData.permission})`, userData.username);
                
                this.showMessage('Usuário criado com sucesso!', 'success');
                this.closeModal('newUserModal');
                document.getElementById('newUserForm').reset();
                await this.loadUsers();
                this.updateStats();
            } else {
                this.showMessage('Erro: Resposta inesperada da API', 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao criar usuário: ' + error.message, 'error');
        }
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // 🔧 CORREÇÕES
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.nome_usuario;
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserPhone').value = user.celular || ''; // CORRIGIDO: celular
        document.getElementById('editUserFunction').value = user.funcao || '';
        document.getElementById('editUserPermission').value = user.permissao;
        document.getElementById('editUserStatus').value = user.status; // CORRIGIDO: status

        this.showModal('editUserModal');
    }

    async updateUser() {
        const formData = new FormData(document.getElementById('editUserForm'));
        const userData = Object.fromEntries(formData);
        const userId = userData.userId;

        // Encontrar usuário original para comparar mudanças
        const originalUser = this.users.find(u => u.id == userId);

        const backendData = {
            nome_usuario: userData.username,
            email: userData.email,
            celular: userData.phone,
            funcao: userData.function,
            permissao: userData.permission,
            status: userData.status
        };

        try {
            const response = await conductorAPI.put(`/users/${userId}`, backendData);
            
            if (response && response.message) {
                // 📋 LOG DAS MUDANÇAS
                const changes = [];
                if (originalUser.nome_usuario !== userData.username) changes.push(`nome: ${originalUser.nome_usuario} → ${userData.username}`);
                if (originalUser.email !== userData.email) changes.push(`email: ${originalUser.email} → ${userData.email}`);
                if (originalUser.funcao !== userData.function) changes.push(`função: ${originalUser.funcao} → ${userData.function}`);
                if (originalUser.permissao !== userData.permission) changes.push(`permissão: ${originalUser.permissao} → ${userData.permission}`);
                if (originalUser.status !== userData.status) changes.push(`status: ${originalUser.status} → ${userData.status}`);
                
                const changeDetails = changes.length > 0 ? ` (${changes.join(', ')})` : '';
                this.addLog('user_updated', `Usuário editado: ${userData.username}${changeDetails}`, userData.username);

                this.showMessage('Usuário atualizado com sucesso!', 'success');
                this.closeModal('editUserModal');
                await this.loadUsers();
                this.updateStats();
            } else {
                this.showMessage('Erro: Resposta inesperada da API', 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao atualizar usuário: ' + error.message, 'error');
        }
    }

    async promoteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        const currentIndex = permissions.indexOf(user.permissao);
        
        if (currentIndex < permissions.length - 1) {
            const newPermission = permissions[currentIndex + 1];
            if (confirm(`Promover ${user.nome_usuario} para ${newPermission}?`)) {
                await this.changeUserPermission(userId, newPermission, 'promote');
            }
        } else {
            alert('Usuário já possui a permissão máxima!');
        }
    }

    async demoteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        const currentIndex = permissions.indexOf(user.permissao);
        
        if (currentIndex > 0) {
            const newPermission = permissions[currentIndex - 1];
            if (confirm(`Rebaixar ${user.nome_usuario} para ${newPermission}?`)) {
                await this.changeUserPermission(userId, newPermission, 'demote');
            }
        } else {
            alert('Usuário já possui a permissão mínima!');
        }
    }

    async changeUserPermission(userId, newPermission, actionType = 'change') {
        const user = this.users.find(u => u.id === userId);
        
        try {
            const response = await conductorAPI.put(`/users/${userId}`, { 
                permissao: newPermission 
            });
            
            if (response && response.message) {
                // 📋 LOG DA AÇÃO
                const actionText = actionType === 'promote' ? 'promovido' : actionType === 'demote' ? 'rebaixado' : 'alterado';
                this.addLog(`user_${actionType}d`, `Usuário ${actionText}: ${user.nome_usuario} (${user.permissao} → ${newPermission})`, user.nome_usuario);

                this.showMessage('Permissão alterada com sucesso!', 'success');
                await this.loadUsers();
                this.updateStats();
            } else {
                this.showMessage('Erro: Resposta inesperada da API', 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao alterar permissão: ' + error.message, 'error');
        }
    }

    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const isActive = user.status === 'Ativo';
        const action = isActive ? 'desativar' : 'ativar';
        const newStatus = isActive ? 'Inativo' : 'Ativo';
        
        if (confirm(`Tem certeza que deseja ${action} o usuário ${user.nome_usuario}?`)) {
            try {
                const response = await conductorAPI.put(`/users/${userId}`, { 
                    status: newStatus 
                });
                
                if (response && response.message) {
                    // 📋 LOG DA AÇÃO
                    this.addLog(`user_${isActive ? 'deactivated' : 'activated'}`, `Usuário ${action}do: ${user.nome_usuario}`, user.nome_usuario);

                    this.showMessage(`Usuário ${action}do com sucesso!`, 'success');
                    await this.loadUsers();
                    this.updateStats();
                } else {
                    this.showMessage('Erro: Resposta inesperada da API', 'error');
                }
            } catch (error) {
                this.showMessage(`Erro ao ${action} usuário: ` + error.message, 'error');
            }
        }
    }

    // Key Management COM LOGS
    async createKey() {
        const formData = new FormData(document.getElementById('newKeyForm'));
        const keyData = Object.fromEntries(formData);

        const keyCode = this.generateKeyCode(keyData.type, keyData.permission);
        
        const backendData = {
            chave: keyCode,
            tipo: keyData.type,
            permissao: keyData.permission,
            data_expiracao: keyData.expiry || null,
            usos_maximo: keyData.type === 'single_use' ? 1 : null,
            descricao: keyData.description || '',
            criado_por: authManager.getCurrentUser()?.nome_usuario || 'Admin'
        };

        try {
            const response = await conductorAPI.post('/chaves', backendData);
            
            if (response && response.message) {
                // 📋 LOG DA AÇÃO
                this.addLog('key_created', `Chave de acesso criada: ${keyCode} (${keyData.type}, ${keyData.permission})`);

                this.showMessage(`Chave criada: ${keyCode}`, 'success');
                this.closeModal('newKeyModal');
                document.getElementById('newKeyForm').reset();
                
                // Recarregar chaves do banco
                await this.loadKeys();
                this.updateStats();

                // Copiar para clipboard
                navigator.clipboard.writeText(keyCode);
                alert(`Chave criada e copiada para clipboard: ${keyCode}`);
            }
        } catch (error) {
            this.showMessage('Erro ao criar chave: ' + error.message, 'error');
        }
    }
    generateKeyCode(type, permission) {
        const typePrefix = {
            'permanent': 'PERM',
            'expiring': 'TEMP',
            'single_use': 'ONCE'
        };

        const permPrefix = {
            'Usuario': 'USR',
            'Operador': 'OPR',
            'Administrador': 'ADM',
            'Desenvolvedor': 'DEV'
        };

        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        return `COND-${typePrefix[type]}-${permPrefix[permission]}-${year}-${random}`;
    }

    copyKey(keyCode) {
        navigator.clipboard.writeText(keyCode);
        
        // 📋 LOG DA AÇÃO
        this.addLog('key_copied', `Chave copiada: ${keyCode}`);
        
        this.showMessage('Chave copiada para clipboard!', 'success');
    }

    async deactivateKey(keyId) {
        if (confirm('Tem certeza que deseja desativar esta chave?')) {
            try {
                const response = await conductorAPI.put(`/chaves/${keyId}`, { 
                    status: 'inativa' 
                });
                
                if (response && response.message) {
                    const key = this.keys.find(k => k.id === keyId);
                    
                    // 📋 LOG DA AÇÃO
                    this.addLog('key_deactivated', `Chave desativada: ${key?.chave || keyId}`);
                    
                    this.showMessage('Chave desativada com sucesso!', 'success');
                    
                    // Recarregar chaves do banco
                    await this.loadKeys();
                    this.updateStats();
                }
            } catch (error) {
                this.showMessage('Erro ao desativar chave: ' + error.message, 'error');
            }
        }
    }

    // Utility Functions
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
    }

    showMessage(message, type) {
        // Implementar sistema de mensagens
        if (type === 'error') {
            alert('Erro: ' + message);
        } else {
            alert(message);
        }
    }

    // Filter Functions
    filterUsers() {
        const search = document.getElementById('userSearch').value.toLowerCase();
        const permissionFilter = document.getElementById('permissionFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        const filteredUsers = this.users.filter(user => {
            const matchesSearch = user.nome_usuario.toLowerCase().includes(search) || 
                                (user.email && user.email.toLowerCase().includes(search));
            const matchesPermission = !permissionFilter || user.permissao === permissionFilter;
            
            // 🔧 CORREÇÃO: Filtro de status correto
            let matchesStatus = true;
            if (statusFilter) {
                if (statusFilter === 'ativo') {
                    matchesStatus = user.status === 'Ativo'; // Banco usa 'Ativo' (maiúsculo)
                } else if (statusFilter === 'inativo') {
                    matchesStatus = user.status === 'Inativo'; // Banco usa 'Inativo' (maiúsculo)
                }
            }

            return matchesSearch && matchesPermission && matchesStatus;
        });

        // Re-render with filtered data
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            const isActive = user.status === 'Ativo';
            const statusClass = isActive ? 'ativo' : 'inativo';
            
            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.nome_usuario}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.funcao || 'N/A'}</td>
                <td><span class="permission-badge permission-${user.permissao.toLowerCase()}">${user.permissao}</span></td>
                <td><span class="user-status status-${statusClass}">${user.status}</span></td>
                <td>${this.formatDate(user.ultimo_login) || 'Nunca'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser(${user.id})">✏️ Editar</button>
                        ${user.permissao !== 'Desenvolvedor' ? `
                            <button class="btn-sm btn-promote" onclick="adminManager.promoteUser(${user.id})">⬆️ Promover</button>
                            <button class="btn-sm btn-demote" onclick="adminManager.demoteUser(${user.id})">⬇️ Rebaixar</button>
                        ` : ''}
                        <button class="btn-sm ${isActive ? 'btn-disable' : 'btn-enable'}" 
                                onclick="adminManager.toggleUserStatus(${user.id})">
                            ${isActive ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Global Functions
function showTab(tabName) {
    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover active dos botões
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab selecionada
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Ativar botão correspondente
    event.target.classList.add('active');
    
    // Atualizar tab atual
    if (window.adminManager) {
        window.adminManager.currentTab = tabName;
    }
}

function showNewUserModal() {
    if (window.adminManager) {
        window.adminManager.showModal('newUserModal');
    }
}

function showNewKeyModal() {
    if (window.adminManager) {
        window.adminManager.showModal('newKeyModal');
    }
}

function closeModal(modalId) {
    if (window.adminManager) {
        window.adminManager.closeModal(modalId);
    }
}

function toggleExpiryField() {
    const keyType = document.getElementById('keyType');
    const expiryGroup = document.getElementById('expiryGroup');
    const keyExpiry = document.getElementById('keyExpiry');
    
    if (keyType && expiryGroup && keyExpiry) {
        if (keyType.value === 'expiring') {
            expiryGroup.style.display = 'block';
            keyExpiry.required = true;
        } else {
            expiryGroup.style.display = 'none';
            keyExpiry.required = false;
        }
    }
}

function filterUsers() {
    if (window.adminManager) {
        window.adminManager.filterUsers();
    }
}

function refreshLogs() {
    if (window.adminManager) {
        window.adminManager.loadLogs();
    }
}

function goBack() {
    window.location.href = 'dashboard.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});