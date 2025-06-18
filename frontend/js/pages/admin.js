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
            // Por enquanto, dados mockados
            this.keys = [
                {
                    id: 1,
                    key: 'COND-ADM-2025-001',
                    type: 'permanent',
                    permission: 'Administrador',
                    created_at: new Date().toISOString(),
                    expires_at: null,
                    uses: 0,
                    max_uses: null,
                    status: 'active',
                    description: 'Chave para novos administradores'
                },
                {
                    id: 2,
                    key: 'COND-USR-2025-002',
                    type: 'single_use',
                    permission: 'Usuario',
                    created_at: new Date().toISOString(),
                    expires_at: null,
                    uses: 1,
                    max_uses: 1,
                    status: 'used',
                    description: 'Chave para estagiário temporário'
                }
            ];
            this.renderKeysTable();
        } catch (error) {
            console.error('Erro ao carregar chaves:', error);
        }
    }

    renderKeysTable() {
        const tbody = document.getElementById('keysTableBody');
        tbody.innerHTML = '';

        this.keys.forEach(key => {
            const row = document.createElement('tr');
            const typeLabels = {
                'permanent': '🔑 Permanente',
                'expiring': '⏰ Expirável',
                'single_use': '1️⃣ Uso Único'
            };

            row.innerHTML = `
                <td><code>${key.key}</code></td>
                <td>${typeLabels[key.type]}</td>
                <td><span class="permission-badge permission-${key.permission.toLowerCase()}">${key.permission}</span></td>
                <td>${this.formatDate(key.created_at)}</td>
                <td>${key.expires_at ? this.formatDate(key.expires_at) : 'Nunca'}</td>
                <td>${key.uses}${key.max_uses ? `/${key.max_uses}` : ''}</td>
                <td><span class="user-status status-${key.status === 'active' ? 'ativo' : 'inativo'}">${key.status === 'active' ? 'Ativa' : 'Inativa'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.copyKey('${key.key}')">📋 Copiar</button>
                        ${key.status === 'active' ? `
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
            // Por enquanto, dados mockados
            this.logs = [
                {
                    id: 1,
                    action: 'login',
                    user: 'dev',
                    details: 'Login realizado com sucesso',
                    timestamp: new Date().toISOString(),
                    ip: '192.168.1.100'
                },
                {
                    id: 2,
                    action: 'user_created',
                    user: 'admin',
                    details: 'Novo usuário criado: teste_user',
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    ip: '192.168.1.100'
                }
            ];
            this.renderLogs();
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
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
            'permission_changed': '🛡️',
            'key_created': '🔑',
            'key_used': '🗝️'
        };

        this.logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <div class="log-icon">${actionIcons[log.action] || '📋'}</div>
                <div class="log-content">
                    <div class="log-action">${log.details}</div>
                    <div class="log-details">Por: ${log.user} • IP: ${log.ip}</div>
                </div>
                <div class="log-time">${this.formatDate(log.timestamp)}</div>
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

    // User Management
    async createUser() {
        const formData = new FormData(document.getElementById('newUserForm'));
        const userData = Object.fromEntries(formData);

        // Mapear campos do frontend para backend
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
            if (response.success) {
                this.showMessage('Usuário criado com sucesso!', 'success');
                this.closeModal('newUserModal');
                document.getElementById('newUserForm').reset();
                await this.loadUsers();
                this.updateStats();
            }
        } catch (error) {
            this.showMessage('Erro ao criar usuário: ' + error.message, 'error');
        }
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Preencher modal de edição
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.nome_usuario;
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserPhone').value = user.telefone || '';
        document.getElementById('editUserFunction').value = user.funcao || '';
        document.getElementById('editUserPermission').value = user.permissao;
        document.getElementById('editUserStatus').value = user.ativo ? 'ativo' : 'inativo';

        this.showModal('editUserModal');
    }

    async updateUser() {
        console.log('🔧 Função updateUser chamada!'); // ← ADICIONAR ESTA LINHA
        console.log('📋 Dados recebidos:', arguments); // ← ADICIONAR

        const formData = new FormData(document.getElementById('editUserForm'));
        const userData = Object.fromEntries(formData);
        const userId = userData.userId;
    

        console.log('📤 Dados que serão enviados:', userData); // ← ADICIONAR

        // Mapear campos do frontend para backend
        const backendData = {
            nome_usuario: userData.username,
            email: userData.email,
            celular: userData.phone,
            funcao: userData.function,
            permissao: userData.permission,
            status: userData.status === 'ativo' ? 'Ativo' : userData.status
        };

         console.log('📤 Dados mapeados para backend:', backendData); // ← ADICIONAR

        try {
            console.log('🚀 Enviando para API...'); // ← ADICIONAR
            const response = await conductorAPI.put(`/users/${userId}`, backendData);
            console.log('📥 Resposta da API:', response); // ← ADICIONAR
            if (response.success) {
                console.log('✅ Sucesso!'); // ← ADICIONAR
                this.showMessage('Usuário atualizado com sucesso!', 'success');
                this.closeModal('editUserModal');
                await this.loadUsers();
                this.updateStats();
            }
        } catch (error) {
            console.log('❌ Erro capturado:', error); // ← ADICIONAR
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
                await this.changeUserPermission(userId, newPermission);
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
                await this.changeUserPermission(userId, newPermission);
            }
        } else {
            alert('Usuário já possui a permissão mínima!');
        }
    }

    async changeUserPermission(userId, newPermission) {
        try {
            const response = await conductorAPI.put(`/users/${userId}`, { 
                permissao: newPermission 
            });
            if (response.success) {
                this.showMessage('Permissão alterada com sucesso!', 'success');
                await this.loadUsers();
                this.updateStats();
            }
        } catch (error) {
            this.showMessage('Erro ao alterar permissão: ' + error.message, 'error');
        }
    }

    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const action = user.ativo ? 'desativar' : 'ativar';
        if (confirm(`Tem certeza que deseja ${action} o usuário ${user.nome_usuario}?`)) {
            try {
                const response = await conductorAPI.put(`/users/${userId}`, { 
                    status: user.ativo ? 'inativo' : 'ativo' 
                });
                if (response.success) {
                    this.showMessage(`Usuário ${action}do com sucesso!`, 'success');
                    await this.loadUsers();
                    this.updateStats();
                }
            } catch (error) {
                this.showMessage(`Erro ao ${action} usuário: ` + error.message, 'error');
            }
        }
    }

    // Key Management
    async createKey() {
        const formData = new FormData(document.getElementById('newKeyForm'));
        const keyData = Object.fromEntries(formData);

        // Gerar chave única
        const keyCode = this.generateKeyCode(keyData.type, keyData.permission);
        keyData.key = keyCode;

        try {
            // Simular criação (implementar backend depois)
            const newKey = {
                id: this.keys.length + 1,
                key: keyCode,
                type: keyData.type,
                permission: keyData.permission,
                created_at: new Date().toISOString(),
                expires_at: keyData.expiry || null,
                uses: 0,
                max_uses: keyData.type === 'single_use' ? 1 : null,
                status: 'active',
                description: keyData.description || ''
            };

            this.keys.push(newKey);
            this.renderKeysTable();
            this.updateStats();

            this.showMessage(`Chave criada: ${keyCode}`, 'success');
            this.closeModal('newKeyModal');
            document.getElementById('newKeyForm').reset();

            // Copiar para clipboard
            navigator.clipboard.writeText(keyCode);
            alert(`Chave criada e copiada para clipboard: ${keyCode}`);

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
        this.showMessage('Chave copiada para clipboard!', 'success');
    }

    async deactivateKey(keyId) {
        if (confirm('Tem certeza que deseja desativar esta chave?')) {
            const key = this.keys.find(k => k.id === keyId);
            if (key) {
                key.status = 'inactive';
                this.renderKeysTable();
                this.updateStats();
                this.showMessage('Chave desativada com sucesso!', 'success');
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
            const matchesStatus = !statusFilter || 
                                (statusFilter === 'ativo' && user.ativo) || 
                                (statusFilter === 'inativo' && !user.ativo);

            return matchesSearch && matchesPermission && matchesStatus;
        });

        // Re-render with filtered data
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${user.nome_usuario}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.funcao || 'N/A'}</td>
                <td><span class="permission-badge permission-${user.permissao.toLowerCase()}">${user.permissao}</span></td>
                <td><span class="user-status status-${user.ativo ? 'ativo' : 'inativo'}">${user.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>${this.formatDate(user.ultimo_login) || 'Nunca'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser(${user.id})">✏️ Editar</button>
                        ${user.permissao !== 'Desenvolvedor' ? `
                            <button class="btn-sm btn-promote" onclick="adminManager.promoteUser(${user.id})">⬆️ Promover</button>
                            <button class="btn-sm btn-demote" onclick="adminManager.demoteUser(${user.id})">⬇️ Rebaixar</button>
                        ` : ''}
                        <button class="btn-sm ${user.ativo ? 'btn-disable' : 'btn-enable'}" 
                                onclick="adminManager.toggleUserStatus(${user.id})">
                            ${user.ativo ? '🚫 Desativar' : '✅ Ativar'}
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
    window.adminManager.currentTab = tabName;
}

function showNewUserModal() {
    window.adminManager.showModal('newUserModal');
}

function showNewKeyModal() {
    window.adminManager.showModal('newKeyModal');
}

function closeModal(modalId) {
    window.adminManager.closeModal(modalId);
}

function toggleExpiryField() {
    const keyType = document.getElementById('keyType').value;
    const expiryGroup = document.getElementById('expiryGroup');
    
    if (keyType === 'expiring') {
        expiryGroup.style.display = 'block';
        document.getElementById('keyExpiry').required = true;
    } else {
        expiryGroup.style.display = 'none';
        document.getElementById('keyExpiry').required = false;
    }
}

function filterUsers() {
    window.adminManager.filterUsers();
}

function refreshLogs() {
    window.adminManager.loadLogs();
}

function goBack() {
    window.location.href = 'dashboard.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});