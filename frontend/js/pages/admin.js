// ===============================================
// CONDUCTOR - ADMIN PAGE CONTROLLER COMPLETO
// ===============================================

class AdminManager {
    constructor() {
        this.users = [];
        this.keys = [];
        this.logs = [];
        this.currentTab = 'users';
    }

    // ===============================================
    // INICIALIZAÇÃO E CONFIGURAÇÃO
    // ===============================================

    async init() {
        // Verificar autenticação
        if (!authManager.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Verificar permissões de admin
        if (!authManager.hasPermission('Administrador')) {
            alert('Acesso negado! Você precisa ser Administrador para acessar esta página.');
            window.location.href = 'dashboard.html';
            return;
        }

        // 📊 MOSTRAR INFORMAÇÕES DO USUÁRIO
        const user = authManager.getCurrentUser();
        if (user) {
            console.log('👤 Usuário administrador:', user.nome_usuario, user.permissao);
        }

        // 🔄 CARREGAR DADOS INICIAIS
        await Promise.all([
            this.loadUsers(),
            this.loadKeys(),
            this.loadLogs(),
            this.loadKeyStatistics() // 🆕 CARREGAR ESTATÍSTICAS
        ]);

        this.updateStats();
        
        // 🕒 INICIAR VERIFICAÇÃO PERIÓDICA
        this.startPeriodicKeyCheck();
        
        // 📋 CONFIGURAR EVENT LISTENERS
        this.setupEventListeners();
        
        // 🔄 INICIAR AUTO-REFRESH
        this.startAutoRefresh();
        
        console.log('⚙️ Administração inicializada com sucesso');
    }

    setupEventListeners() {
        // Event listeners dos formulários
        document.getElementById('newUserForm').addEventListener('submit', (e) => this.createUser(e));
        document.getElementById('newKeyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createKey();
        });
        
        // Event listeners para edição de usuário
        const editForm = document.getElementById('editUserForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.updateUser(e));
        }
        
        // Event listeners dos filtros
        document.getElementById('userSearch').addEventListener('input', () => this.filterUsers());
        document.getElementById('permissionFilter').addEventListener('change', () => this.filterUsers());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterUsers());
        
        // 🆕 ATALHOS DE TECLADO
        document.addEventListener('keydown', (e) => {
            // ESC para fechar modais (já implementado no HTML)
            
            // CTRL+R para refresh manual
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.loadKeys();
                this.loadKeyStatistics();
            }
            
            // F5 para debug
            if (e.key === 'F5') {
                e.preventDefault();
                this.debugKeyStatus();
            }
        });
        
        console.log('📡 Event listeners configurados');
    }

    // ===============================================
    // SISTEMA DE LOGS COMPLETO
    // ===============================================

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
            console.log('✅ Log salvo com sucesso:', response);
            
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
                usuario: currentUser ? `${currentUser.nome_usuario} (${currentUser.permissao})` : 'Sistema',
                detalhes: details,
                data_criacao: new Date().toISOString()
            };
            
            this.logs.unshift(newLog);
            if (this.logs.length > 100) this.logs = this.logs.slice(0, 100);
            
            if (this.currentTab === 'logs') {
                this.renderLogs();
            }
        }
    }

    // ===============================================
    // CARREGAMENTO DE DADOS
    // ===============================================

    async loadUsers() {
        try {
            const response = await window.conductorAPI.get('/users');
            if (response && response.data) {
                this.users = response.data;
            } else {
                console.warn('Nenhum usuário encontrado ou API indisponível');
                this.users = [];
            }
            this.renderUsersTable();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.users = [];
            this.renderUsersTable();
        }
    }

    async loadKeys() {
        try {
            const response = await window.conductorAPI.get('/chaves');
            if (response && response.data) {
                this.keys = response.data;
                
                // 🕒 VERIFICAR STATUS AUTOMATICAMENTE APÓS CARREGAR
                await this.checkAndUpdateKeyStatus();
            } else {
                // Se não há endpoint ainda, manter dados mockados para teste
                this.keys = [];
            }
            this.renderKeysTable();
        } catch (error) {
            console.error('Erro ao carregar chaves:', error);
            this.keys = [];
            this.renderKeysTable();
        }
    }

    async loadLogs() {
        try {
            const response = await window.conductorAPI.get('/logs');
            if (response && response.data) {
                this.logs = response.data;
            } else {
                console.warn('Nenhum log encontrado ou API indisponível');
                this.logs = [];
            }
            this.renderLogs();
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            this.logs = [];
            this.renderLogs();
        }
    }

    // ===============================================
    // SISTEMA DE VERIFICAÇÃO E EXPIRAÇÃO DE CHAVES
    // ===============================================

    // 🆕 NOVA FUNÇÃO: Verificar e atualizar status das chaves
    async checkAndUpdateKeyStatus() {
        if (!this.keys || this.keys.length === 0) return;

        const now = new Date();
        let updated = false;

        for (let key of this.keys) {
            let shouldUpdate = false;
            let newStatus = key.status;

            // ⏰ VERIFICAR CHAVES EXPIRÁVEIS
            if (key.tipo === 'expiring' && key.data_expiracao && key.status === 'ativa') {
                const expirationDate = new Date(key.data_expiracao);
                if (now > expirationDate) {
                    newStatus = 'expirada';
                    shouldUpdate = true;
                    console.log(`🔑 Chave expirada detectada: ${key.chave}`);
                }
            }

            // 1️⃣ VERIFICAR CHAVES DE USO ÚNICO
            if (key.tipo === 'single_use' && key.status === 'ativa') {
                if (key.usos_atual > 0) {
                    newStatus = 'usada';
                    shouldUpdate = true;
                    console.log(`🔑 Chave de uso único utilizada: ${key.chave}`);
                }
            }

            // 📊 VERIFICAR LIMITE DE USOS (para qualquer tipo)
            if (key.usos_maximo && key.usos_atual >= key.usos_maximo && key.status === 'ativa') {
                newStatus = 'usada';
                shouldUpdate = true;
                console.log(`🔑 Chave com limite de usos atingido: ${key.chave}`);
            }

            // 💾 ATUALIZAR NO BACKEND SE NECESSÁRIO
            if (shouldUpdate) {
                try {
                    await window.conductorAPI.put(`/chaves/${key.id}`, { 
                        status: newStatus 
                    });
                    
                    // 📋 LOG DA AÇÃO
                    this.addLog('key_auto_updated', `Chave automaticamente ${newStatus}: ${key.chave}`);
                    
                    key.status = newStatus; // Atualizar localmente
                    updated = true;
                } catch (error) {
                    console.error(`Erro ao atualizar status da chave ${key.id}:`, error);
                }
            }
        }

        // 🔄 RECARREGAR INTERFACE SE HOUVE MUDANÇAS
        if (updated) {
            this.renderKeysTable();
            this.updateStats();
        }
    }

    // 🆕 NOVA FUNÇÃO: Verificação manual de todas as chaves
    async checkAllKeysStatus() {
        try {
            // 🔄 MOSTRAR LOADING
            const checkButton = event.target;
            const originalText = checkButton.innerHTML;
            checkButton.innerHTML = '<div class="loading"></div> Verificando...';
            checkButton.disabled = true;
            
            const response = await window.conductorAPI.get('/chaves/check-status');
            
            if (response && response.success) {
                const result = response.data;
                
                // 📋 LOG DA AÇÃO
                this.addLog('system_check', `Verificação de chaves concluída: ${result.updated} atualizadas, ${result.expired} expiradas, ${result.used} usadas`);
                
                // 🔔 MOSTRAR RESULTADO
                let message = `Verificação concluída!\n`;
                message += `• ${result.updated} chaves atualizadas\n`;
                message += `• ${result.expired} chaves expiradas\n`;
                message += `• ${result.used} chaves usadas`;
                
                this.showMessage(message, 'success');
                
                // 🔄 RECARREGAR DADOS
                await this.loadKeys();
                await this.loadKeyStatistics();
                
            } else {
                this.showMessage('Erro na verificação: ' + (response.message || 'Resposta inválida'), 'error');
            }
            
        } catch (error) {
            this.showMessage('Erro ao verificar chaves: ' + error.message, 'error');
        } finally {
            // 🔄 RESTAURAR BOTÃO
            const checkButton = event.target;
            checkButton.innerHTML = originalText;
            checkButton.disabled = false;
        }
    }

    // 🆕 NOVA FUNÇÃO: Carregar estatísticas detalhadas de chaves
    async loadKeyStatistics() {
        try {
            const response = await window.conductorAPI.get('/chaves/statistics');
            if (response && response.success && response.data) {
                const stats = response.data;
                
                // 📊 ATUALIZAR ESTATÍSTICAS PRINCIPAIS
                document.getElementById('totalKeys').textContent = stats.ativas || 0;
                document.getElementById('expiredKeys').textContent = stats.expiradas || 0;
                document.getElementById('usedKeys').textContent = stats.usadas || 0;
                
                // 📊 ATUALIZAR ESTATÍSTICAS DETALHADAS
                document.getElementById('permanentKeys').textContent = stats.tipos.permanent || 0;
                document.getElementById('expiringKeys').textContent = stats.tipos.expiring || 0;
                document.getElementById('oneTimeKeys').textContent = stats.tipos.single_use || 0;
                
                // 📊 ESTATÍSTICAS EXTRAS
                const expiring24hElement = document.getElementById('expiring24h');
                if (expiring24hElement) {
                    expiring24hElement.textContent = stats.expirandoEm24h || 0;
                    
                    // 🚨 DESTACAR SE HÁ CHAVES EXPIRANDO
                    if (stats.expirandoEm24h > 0) {
                        expiring24hElement.parentElement.classList.add('key-critical');
                    } else {
                        expiring24hElement.parentElement.classList.remove('key-critical');
                    }
                }
                
                console.log('📊 Estatísticas de chaves atualizadas:', stats);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas de chaves:', error);
            this.showMessage('Erro ao carregar estatísticas: ' + error.message, 'error');
        }
    }

    // 🔄 INICIAR VERIFICAÇÃO PERIÓDICA
    startPeriodicKeyCheck() {
        // Verificar status das chaves a cada 5 minutos
        setInterval(() => {
            if (this.currentTab === 'keys' && this.keys && this.keys.length > 0) {
                console.log('🔄 Verificação periódica de chaves...');
                this.checkAndUpdateKeyStatus();
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    // 🆕 NOVA FUNÇÃO: Auto-refresh inteligente
    startAutoRefresh() {
        // 🔄 AUTO-REFRESH A CADA 30 SEGUNDOS NA TAB ATIVA
        setInterval(() => {
            if (document.visibilityState === 'visible' && this.currentTab === 'keys') {
                console.log('🔄 Auto-refresh de chaves...');
                this.loadKeys().catch(error => {
                    console.warn('Erro no auto-refresh:', error);
                });
            }
        }, 30000); // 30 segundos
    }

    // ===============================================
    // RENDERIZAÇÃO DE TABELAS
    // ===============================================

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (!this.users || this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--gray-lighter);">Nenhum usuário encontrado</td></tr>';
            return;
        }

        this.users.forEach(user => {
            const row = document.createElement('tr');
            const isActive = user.status === 'Ativo';
            const statusClass = isActive ? 'status-ativo' : 'status-inativo';

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nome_usuario}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.funcao || 'N/A'}</td>
                <td><span class="permission-badge permission-${user.permissao.toLowerCase()}">${user.permissao}</span></td>
                <td><span class="user-status ${statusClass}">${user.status}</span></td>
                <td>${this.formatDate(user.ultimo_login)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser(${user.id})">✏️ Editar</button>
                        <button class="btn-sm btn-promote" onclick="adminManager.changeUserPermission(${user.id}, 'promote')">⬆️ Promover</button>
                        <button class="btn-sm btn-demote" onclick="adminManager.changeUserPermission(${user.id}, 'demote')">⬇️ Rebaixar</button>
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

    // 🆕 NOVA FUNÇÃO: Renderizar chaves com verificações de status
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

            // 🎨 STATUS COM CORES E ÍCONES VISUAIS
            const statusDisplay = this.getStatusDisplay(keyStatus, key);
            
            // ⏰ VERIFICAÇÃO DE EXPIRAÇÃO VISUAL
            const expirationDisplay = this.getExpirationDisplay(key);

            row.innerHTML = `
                <td><code class="key-code">${keyChave}</code></td>
                <td>${typeLabels[keyType] || keyType}</td>
                <td><span class="permission-badge permission-${keyPermission.toLowerCase()}">${keyPermission}</span></td>
                <td>${this.formatDate(key.data_criacao || key.created_at)}</td>
                <td>${expirationDisplay}</td>
                <td>${key.usos_atual || 0}${key.usos_maximo ? `/${key.usos_maximo}` : ''}</td>
                <td>${statusDisplay}</td>
                <td>
                    <div class="action-buttons">
                        ${this.getKeyActionButtons(key, keyStatus)}
                    </div>
                </td>
            `;
            
            // 🎨 ADICIONAR CLASSE VISUAL PARA CHAVES EXPIRADAS/USADAS
            if (keyStatus === 'expirada' || keyStatus === 'usada' || keyStatus === 'inativa') {
                row.classList.add('key-disabled');
            }

            tbody.appendChild(row);
        });
    }

    // 🆕 NOVA FUNÇÃO: Display visual de status
    getStatusDisplay(status, key) {
        const now = new Date();
        
        switch (status) {
            case 'ativa':
                // 📊 VERIFICAR SE ESTÁ PRÓXIMA DA EXPIRAÇÃO
                if (key.tipo === 'expiring' && key.data_expiracao) {
                    const expirationDate = new Date(key.data_expiracao);
                    const timeLeft = expirationDate - now;
                    const hoursLeft = timeLeft / (1000 * 60 * 60);
                    
                    if (hoursLeft < 24 && hoursLeft > 0) {
                        return '<span class="status-badge status-warning">⚠️ Expira em breve</span>';
                    }
                }
                return '<span class="status-badge status-active">✅ Ativa</span>';
                
            case 'expirada':
                return '<span class="status-badge status-expired">⏰ Expirada</span>';
                
            case 'usada':
                return '<span class="status-badge status-used">✔️ Usada</span>';
                
            case 'inativa':
                return '<span class="status-badge status-inactive">🚫 Inativa</span>';
                
            default:
                return `<span class="status-badge status-unknown">❓ ${status}</span>`;
        }
    }

    // 🆕 NOVA FUNÇÃO: Display de expiração
    getExpirationDisplay(key) {
        if (!key.data_expiracao) {
            return '<span class="text-gray">Sem expiração</span>';
        }

        const now = new Date();
        const expirationDate = new Date(key.data_expiracao);
        const timeLeft = expirationDate - now;

        if (timeLeft < 0) {
            return `<span class="text-error">${this.formatDate(key.data_expiracao)} (Expirou)</span>`;
        }

        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 1) {
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
            return `<span class="text-warning">${this.formatDate(key.data_expiracao)} (${hoursLeft}h restantes)</span>`;
        }

        return `<span class="text-normal">${this.formatDate(key.data_expiracao)} (${daysLeft} dias)</span>`;
    }

    // 🆕 NOVA FUNÇÃO: Botões de ação baseados no status
    getKeyActionButtons(key, status) {
        let buttons = '';
        
        // 📋 BOTÃO COPIAR (sempre disponível)
        buttons += `<button class="btn-small btn-secondary" onclick="adminManager.copyKey('${key.chave}')">📋 Copiar</button>`;
        
        // 🔄 BOTÕES BASEADOS NO STATUS
        if (status === 'ativa') {
            buttons += `<button class="btn-small btn-danger" onclick="adminManager.deactivateKey(${key.id})">🚫 Desativar</button>`;
        } else if (status === 'inativa') {
            buttons += `<button class="btn-small btn-success" onclick="adminManager.reactivateKey(${key.id})">✅ Reativar</button>`;
        }
        
        // 🗑️ BOTÃO EXCLUIR (para chaves usadas/expiradas)
        if (status === 'usada' || status === 'expirada') {
            buttons += `<button class="btn-small btn-danger" onclick="adminManager.deleteKey(${key.id})">🗑️ Excluir</button>`;
        }

        return buttons;
    }

    renderLogs() {
        const container = document.getElementById('logsContainer');
        container.innerHTML = '';

        if (!this.logs || this.logs.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gray-lighter);">Nenhum log encontrado</div>';
            return;
        }

        this.logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';

            const actionIcons = {
                'login': '🔐',
                'logout': '🚪',
                'user_created': '👤',
                'user_updated': '✏️',
                'permission_changed': '🔄',
                'key_created': '🔑',
                'key_used': '✅',
                'key_expired': '⏰',
                'key_auto_updated': '🔄',
                'system_check': '🔍'
            };

            const icon = actionIcons[log.acao] || '📋';

            logItem.innerHTML = `
                <div class="log-icon">${icon}</div>
                <div class="log-content">
                    <div class="log-action">${this.formatActionName(log.acao)}</div>
                    <div class="log-details">${log.detalhes}</div>
                </div>
                <div class="log-time">${this.formatDate(log.data_criacao)}</div>
            `;

            container.appendChild(logItem);
        });
    }

    // ===============================================
    // GESTÃO DE USUÁRIOS
    // ===============================================

    async createUser(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = Object.fromEntries(formData);

        // 🔧 MAPEAMENTO CORRETO DOS CAMPOS
        const backendData = {
            nome_usuario: userData.username,
            email: userData.email,
            celular: userData.phone || null,
            funcao: userData.function || null,
            permissao: userData.permission,
            senha: userData.password
        };

        try {
            const response = await window.conductorAPI.post('/users', backendData);
            
            if (response && response.message) {
                // 📋 LOG DA AÇÃO
                this.addLog('user_created', `Usuário criado: ${userData.username} (${userData.permission})`, userData.username);

                this.showMessage('Usuário criado com sucesso!', 'success');
                this.closeModal('newUserModal');
                event.target.reset();
                
                await this.loadUsers();
                this.updateStats();
            } else {
                this.showMessage('Erro: Resposta inesperada da API', 'error');
            }
        } catch (error) {
            this.showMessage('Erro ao criar usuário: ' + error.message, 'error');
        }
    }

    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Preencher modal com dados do usuário
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.nome_usuario;
        document.getElementById('editUserEmail').value = user.email || '';
        document.getElementById('editUserPhone').value = user.celular || '';
        document.getElementById('editUserFunction').value = user.funcao || '';

        // Mostrar modal
        document.getElementById('editUserModal').style.display = 'flex';
    }

    async updateUser(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = Object.fromEntries(formData);
        const userId = userData.userId;

        const updateData = {
            nome_usuario: userData.username,
            email: userData.email,
            celular: userData.phone || null,
            funcao: userData.function || null
        };

        try {
            const response = await window.conductorAPI.put(`/users/${userId}`, updateData);
            
            if (response && response.message) {
                // 📋 LOG DA AÇÃO
                this.addLog('user_updated', `Usuário atualizado: ${userData.username}`, userData.username);

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

    async changeUserPermission(userId, actionType) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        const currentIndex = permissions.indexOf(user.permissao);
        
        let newIndex;
        if (actionType === 'promote' && currentIndex < permissions.length - 1) {
            newIndex = currentIndex + 1;
        } else if (actionType === 'demote' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else {
            this.showMessage('Não é possível ' + (actionType === 'promote' ? 'promover' : 'rebaixar') + ' este usuário.', 'warning');
            return;
        }

        const newPermission = permissions[newIndex];
        
        if (confirm(`Tem certeza que deseja ${actionType === 'promote' ? 'promover' : 'rebaixar'} ${user.nome_usuario} para ${newPermission}?`)) {
            try {
                const response = await window.conductorAPI.put(`/users/${userId}`, { 
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
    }

    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const isActive = user.status === 'Ativo';
        const action = isActive ? 'desativar' : 'ativar';
        const newStatus = isActive ? 'Inativo' : 'Ativo';
        
        if (confirm(`Tem certeza que deseja ${action} o usuário ${user.nome_usuario}?`)) {
            try {
                const response = await window.conductorAPI.put(`/users/${userId}`, { 
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

    // ===============================================
    // GESTÃO DE CHAVES DE ACESSO
    // ===============================================

    // 🆕 NOVA FUNÇÃO: Validação de formulário de chave
    validateKeyForm() {
        const form = document.getElementById('newKeyForm');
        const formData = new FormData(form);
        const keyData = Object.fromEntries(formData);
        
        // 🔍 VALIDAÇÕES BÁSICAS
        if (!keyData.type) {
            this.showMessage('Selecione o tipo de chave', 'error');
            return false;
        }
        
        if (!keyData.permission) {
            this.showMessage('Selecione a permissão da chave', 'error');
            return false;
        }
        
        // ⏰ VALIDAR DATA DE EXPIRAÇÃO
        if (keyData.type === 'expiring') {
            if (!keyData.expiry) {
                this.showMessage('Data de expiração é obrigatória para chaves expiráveis', 'error');
                return false;
            }
            
            const expiryDate = new Date(keyData.expiry);
            const now = new Date();
            
            if (expiryDate <= now) {
                this.showMessage('Data de expiração deve ser no futuro', 'error');
                return false;
            }
            
            // ⚠️ AVISAR SE EXPIRAÇÃO É MUITO PRÓXIMA
            const diff = expiryDate.getTime() - now.getTime();
            const hours = diff / (1000 * 60 * 60);
            
            if (hours < 1) {
                if (!confirm('A chave expirará em menos de 1 hora. Deseja continuar?')) {
                    return false;
                }
            }
        }
        
        return true;
    }

    async createKey() {
        // 🔍 VALIDAR FORMULÁRIO ANTES DE PROSSEGUIR
        if (!this.validateKeyForm()) {
            return;
        }
        
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
            // 🔄 MOSTRAR LOADING NO BOTÃO
            const submitButton = document.querySelector('#newKeyForm button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<div class="loading"></div> Criando...';
            submitButton.disabled = true;
            
            const response = await window.conductorAPI.post('/chaves', backendData);
            
            if (response && response.message) {
                // 📋 LOG DA AÇÃO
                this.addLog('key_created', `Chave de acesso criada: ${keyCode} (${keyData.type}, ${keyData.permission})`);

                this.showMessage(`Chave criada com sucesso: ${keyCode}`, 'success');
                this.closeModal('newKeyModal');
                document.getElementById('newKeyForm').reset();
                
                // 🔄 RECARREGAR DADOS
                await Promise.all([
                    this.loadKeys(),
                    this.loadKeyStatistics()
                ]);
                this.updateStats();

                // 📋 COPIAR PARA CLIPBOARD
                try {
                    await navigator.clipboard.writeText(keyCode);
                    this.showMessage('Chave copiada para clipboard!', 'success');
                } catch (clipboardError) {
                    console.warn('Erro ao copiar para clipboard:', clipboardError);
                }
                
            } else {
                this.showMessage('Erro: Resposta inesperada da API', 'error');
            }
            
        } catch (error) {
            this.showMessage('Erro ao criar chave: ' + error.message, 'error');
            console.error('Erro detalhado:', error);
        } finally {
            // 🔄 RESTAURAR BOTÃO
            const submitButton = document.querySelector('#newKeyForm button[type="submit"]');
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
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
        navigator.clipboard.writeText(keyCode).then(() => {
            // 📋 LOG DA AÇÃO
            this.addLog('key_copied', `Chave copiada: ${keyCode}`);
            
            this.showMessage('Chave copiada para clipboard!', 'success');
        }).catch(error => {
            console.error('Erro ao copiar:', error);
            this.showMessage('Erro ao copiar chave', 'error');
        });
    }

    async deactivateKey(keyId) {
        if (confirm('Tem certeza que deseja desativar esta chave?')) {
            try {
                const response = await window.conductorAPI.put(`/chaves/${keyId}`, { 
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

    // 🆕 NOVA FUNÇÃO: Reativar chave
    async reactivateKey(keyId) {
        const key = this.keys.find(k => k.id === keyId);
        if (!key) return;

        // 🔍 VERIFICAÇÕES ANTES DE REATIVAR
        if (key.tipo === 'expiring' && key.data_expiracao) {
            const now = new Date();
            const expirationDate = new Date(key.data_expiracao);
            if (now > expirationDate) {
                this.showMessage('Não é possível reativar uma chave expirada!', 'error');
                return;
            }
        }

        if (key.tipo === 'single_use' && key.usos_atual > 0) {
            this.showMessage('Não é possível reativar uma chave de uso único já utilizada!', 'error');
            return;
        }

        if (confirm(`Tem certeza que deseja reativar a chave ${key.chave}?`)) {
            try {
                const response = await window.conductorAPI.put(`/chaves/${keyId}`, { 
                    status: 'ativa' 
                });
                
                if (response && response.message) {
                    // 📋 LOG DA AÇÃO
                    this.addLog('key_reactivated', `Chave reativada: ${key.chave}`);
                    
                    this.showMessage('Chave reativada com sucesso!', 'success');
                    
                    // Recarregar chaves do banco
                    await this.loadKeys();
                    this.updateStats();
                }
            } catch (error) {
                this.showMessage('Erro ao reativar chave: ' + error.message, 'error');
            }
        }
    }

    // 🆕 NOVA FUNÇÃO: Excluir chave
    async deleteKey(keyId) {
        const key = this.keys.find(k => k.id === keyId);
        if (!key) return;

        if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a chave ${key.chave}?\n\nEsta ação não pode ser desfeita!`)) {
            try {
                const response = await window.conductorAPI.delete(`/chaves/${keyId}`);
                
                if (response && response.message) {
                    // 📋 LOG DA AÇÃO
                    this.addLog('key_deleted', `Chave excluída permanentemente: ${key.chave}`);
                    
                    this.showMessage('Chave excluída permanentemente!', 'success');
                    
                    // Recarregar chaves do banco
                    await this.loadKeys();
                    this.updateStats();
                }
            } catch (error) {
                this.showMessage('Erro ao excluir chave: ' + error.message, 'error');
            }
        }
    }

    // ===============================================
    // RELATÓRIOS E EXPORTAÇÃO
    // ===============================================

    // 🆕 NOVA FUNÇÃO: Exportar relatório de chaves
    exportKeysReport() {
        try {
            const reportData = this.keys.map(key => ({
                'Código': key.chave,
                'Tipo': key.tipo,
                'Permissão': key.permissao,
                'Status': key.status,
                'Criada em': this.formatDate(key.data_criacao).replace(/<[^>]*>/g, ''),
                'Expira em': key.data_expiracao ? this.formatDate(key.data_expiracao).replace(/<[^>]*>/g, '') : 'Nunca',
                'Usos': `${key.usos_atual}/${key.usos_maximo || '∞'}`,
                'Criada por': key.criado_por || 'Sistema'
            }));
            
            // 📄 CONVERTER PARA CSV
            const headers = Object.keys(reportData[0]);
            const csvContent = [
                headers.join(','),
                ...reportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
            ].join('\n');
            
            // 💾 DOWNLOAD DO ARQUIVO
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `conductor_chaves_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            // 📋 LOG DA AÇÃO
            this.addLog('export_keys', `Relatório de chaves exportado (${reportData.length} registros)`);
            
            this.showMessage(`Relatório exportado com ${reportData.length} chaves`, 'success');
            
        } catch (error) {
            this.showMessage('Erro ao exportar relatório: ' + error.message, 'error');
            console.error('Erro na exportação:', error);
        }
    }

    // ===============================================
    // FILTROS E BUSCA
    // ===============================================

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
            const statusClass = isActive ? 'status-ativo' : 'status-inativo';

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nome_usuario}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.funcao || 'N/A'}</td>
                <td><span class="permission-badge permission-${user.permissao.toLowerCase()}">${user.permissao}</span></td>
                <td><span class="user-status ${statusClass}">${user.status}</span></td>
                <td>${this.formatDate(user.ultimo_login)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sm btn-edit" onclick="adminManager.editUser(${user.id})">✏️ Editar</button>
                        <button class="btn-sm btn-promote" onclick="adminManager.changeUserPermission(${user.id}, 'promote')">⬆️ Promover</button>
                        <button class="btn-sm btn-demote" onclick="adminManager.changeUserPermission(${user.id}, 'demote')">⬇️ Rebaixar</button>
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

    // ===============================================
    // ESTATÍSTICAS E CONTADORES
    // ===============================================

    updateStats() {
        // Estatísticas de usuários
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.status === 'Ativo').length;
        
        document.getElementById('totalUsers').textContent = totalUsers;
        
        // 📊 ESTATÍSTICAS BÁSICAS DE CHAVES (fallback se API não disponível)
        if (this.keys && this.keys.length > 0) {
            const activeKeys = this.keys.filter(k => k.status === 'ativa').length;
            const expiredKeys = this.keys.filter(k => k.status === 'expirada').length;
            const usedKeys = this.keys.filter(k => k.status === 'usada').length;
            const inactiveKeys = this.keys.filter(k => k.status === 'inativa').length;
            
            // Tipos de chave
            const permanentKeys = this.keys.filter(k => k.tipo === 'permanent').length;
            const expiringKeys = this.keys.filter(k => k.tipo === 'expiring').length;
            const oneTimeKeys = this.keys.filter(k => k.tipo === 'single_use').length;

            // 🔄 ATUALIZAR CONTADORES NA INTERFACE
            document.getElementById('totalKeys').textContent = activeKeys;
            document.getElementById('permanentKeys').textContent = permanentKeys;
            document.getElementById('expiringKeys').textContent = expiringKeys;
            document.getElementById('oneTimeKeys').textContent = oneTimeKeys;
            
            // 📊 CONTADORES EXTRAS
            const expiredKeysElement = document.getElementById('expiredKeys');
            if (expiredKeysElement) {
                expiredKeysElement.textContent = expiredKeys;
            }

            const usedKeysElement = document.getElementById('usedKeys');
            if (usedKeysElement) {
                usedKeysElement.textContent = usedKeys;
            }

            // ⚠️ VERIFICAR CHAVES EXPIRANDO EM 24H (cálculo local)
            const expiring24hElement = document.getElementById('expiring24h');
            if (expiring24hElement) {
                const now = new Date();
                const expiring24h = this.keys.filter(k => {
                    if (k.tipo !== 'expiring' || !k.data_expiracao || k.status !== 'ativa') {
                        return false;
                    }
                    const expirationDate = new Date(k.data_expiracao);
                    const diff = expirationDate.getTime() - now.getTime();
                    const hours = diff / (1000 * 60 * 60);
                    return hours > 0 && hours <= 24;
                }).length;
                
                expiring24hElement.textContent = expiring24h;
                
                // 🚨 DESTACAR SE HÁ CHAVES EXPIRANDO
                if (expiring24h > 0) {
                    expiring24hElement.parentElement.classList.add('key-critical');
                } else {
                    expiring24hElement.parentElement.classList.remove('key-critical');
                }
            }
        }
        
        // 🔄 TENTAR CARREGAR ESTATÍSTICAS DA API
        this.loadKeyStatistics();
    }

    // ===============================================
    // UTILIDADES E HELPERS
    // ===============================================

    // 🆕 FUNÇÃO UTILITÁRIA: Calcular tempo restante
    calculateTimeRemaining(expirationDate) {
        const now = new Date();
        const expiry = new Date(expirationDate);
        const diff = expiry.getTime() - now.getTime();
        
        if (diff <= 0) {
            return { expired: true, text: 'Expirou' };
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return { expired: false, text: `${days}d ${hours}h`, critical: days < 1 };
        } else if (hours > 0) {
            return { expired: false, text: `${hours}h ${minutes}m`, critical: hours < 24 };
        } else {
            return { expired: false, text: `${minutes}m`, critical: true };
        }
    }

    // 🔄 FORMATAÇÃO MELHORADA DE DATA
    formatDate(dateString) {
        if (!dateString) return '<span class="text-gray">—</span>';
        
        try {
            const date = new Date(dateString);
            
            // 🔍 VERIFICAR SE É DATA VÁLIDA
            if (isNaN(date.getTime())) {
                return '<span class="text-gray">Data inválida</span>';
            }
            
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            // 📅 FORMATAÇÃO BASEADA NO TEMPO DECORRIDO
            if (days === 0) {
                return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            } else if (days === 1) {
                return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            } else if (days < 7) {
                return `${days} dias atrás`;
            } else {
                return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return '<span class="text-gray">Erro na data</span>';
        }
    }

    formatActionName(action) {
        const actionNames = {
            'login': 'Login realizado',
            'logout': 'Logout realizado',
            'user_created': 'Usuário criado',
            'user_updated': 'Usuário atualizado',
            'user_promoted': 'Usuário promovido',
            'user_demoted': 'Usuário rebaixado',
            'user_activated': 'Usuário ativado',
            'user_deactivated': 'Usuário desativado',
            'permission_changed': 'Permissão alterada',
            'key_created': 'Chave criada',
            'key_used': 'Chave utilizada',
            'key_copied': 'Chave copiada',
            'key_deactivated': 'Chave desativada',
            'key_reactivated': 'Chave reativada',
            'key_deleted': 'Chave excluída',
            'key_expired': 'Chave expirada',
            'key_auto_updated': 'Status atualizado automaticamente',
            'system_check': 'Verificação do sistema',
            'export_keys': 'Relatório exportado'
        };

        return actionNames[action] || action;
    }

    // 🆕 MELHOR SISTEMA DE MENSAGENS
    showMessage(message, type = 'info') {
        // 🚨 IMPLEMENTAÇÃO SIMPLES POR ENQUANTO (será substituída por toast)
        const iconMap = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const icon = iconMap[type] || iconMap['info'];
        
        // 📱 USAR ALERT POR ENQUANTO (será toast na próxima sessão)
        alert(`${icon} ${message}`);
        
        // 📋 LOG CONSOLE PARA DEBUG
        console.log(`${icon} [${type.toUpperCase()}] ${message}`);
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        
        // Limpar formulários
        const modal = document.getElementById(modalId);
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }

    // ===============================================
    // DEBUG E DIAGNÓSTICO
    // ===============================================

    // 🆕 NOVA FUNÇÃO: Debug e diagnóstico
    debugKeyStatus() {
        console.group('🔍 Debug de Chaves');
        console.log('📊 Total de chaves:', this.keys.length);
        console.log('📋 Chaves por status:', {
            ativas: this.keys.filter(k => k.status === 'ativa').length,
            expiradas: this.keys.filter(k => k.status === 'expirada').length,
            usadas: this.keys.filter(k => k.status === 'usada').length,
            inativas: this.keys.filter(k => k.status === 'inativa').length
        });
        console.log('📋 Chaves por tipo:', {
            permanent: this.keys.filter(k => k.tipo === 'permanent').length,
            expiring: this.keys.filter(k => k.tipo === 'expiring').length,
            single_use: this.keys.filter(k => k.tipo === 'single_use').length
        });
        console.table(this.keys.map(k => ({
            chave: k.chave.substring(0, 20) + '...',
            tipo: k.tipo,
            status: k.status,
            usos: `${k.usos_atual}/${k.usos_maximo || '∞'}`,
            expiracao: k.data_expiracao ? new Date(k.data_expiracao).toLocaleDateString('pt-BR') : 'Nunca'
        })));
        console.groupEnd();
    }

} // FIM DA CLASSE AdminManager

// ===============================================
// INICIALIZAÇÃO GLOBAL
// ===============================================

// 🚀 INSTÂNCIA GLOBAL DO ADMIN MANAGER
window.adminManager = new AdminManager();

// 🔄 INICIALIZAR QUANDO DOM ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager.init();
    
    // 🎯 CONFIGURAR TAB INICIAL
    showTab('users');
    
    console.log('⚙️ Sistema de administração carregado e pronto!');
});

// ===============================================
// FUNÇÕES GLOBAIS PARA INTEGRAÇÃO COM HTML
// ===============================================

// 📊 Função global para estatísticas
function refreshStats() {
    if (window.adminManager) {
        window.adminManager.loadKeyStatistics();
        window.adminManager.updateStats();
    }
}

// 🔍 Função global para debug
function debugKeys() {
    if (window.adminManager) {
        window.adminManager.debugKeyStatus();
    }
}

// 📄 Função global para exportar
function exportKeys() {
    if (window.adminManager) {
        window.adminManager.exportKeysReport();
    }
}

// 🔄 Função global para verificação manual
function checkAllKeys() {
    if (window.adminManager) {
        window.adminManager.checkAllKeysStatus();
    }
}