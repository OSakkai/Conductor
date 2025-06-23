// ===============================================
// CONDUCTOR - PROFILE PAGE MANAGER CORRIGIDO
// frontend/js/pages/profile.js
// ===============================================

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            console.log('🔍 Inicializando ProfileManager...');
            
            // ⚠️ VERIFICAR SE AUTH MANAGER EXISTE
            if (!window.authManager) {
                console.error('❌ AuthManager não disponível');
                window.location.href = '/login.html';
                return;
            }

            // 🔐 PROTEGER PÁGINA E VERIFICAR AUTENTICAÇÃO
            const isAuthenticated = await window.authManager.requireAuth();
            if (!isAuthenticated) {
                console.log('❌ Usuário não autenticado, redirecionando...');
                return;
            }

            // ✅ CARREGAR DADOS DO USUÁRIO
            this.currentUser = window.authManager.getCurrentUser();
            console.log('👤 Usuário atual:', this.currentUser);

            if (!this.currentUser) {
                console.error('❌ Dados do usuário não encontrados');
                window.location.href = '/login.html';
                return;
            }

            // 🚀 INICIALIZAR INTERFACE
            this.loadUserProfile();
            this.setupEventListeners();
            this.loadUserActivity();
            
            console.log('✅ ProfileManager inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ProfileManager:', error);
            window.location.href = '/login.html';
        }
    }

    // ===============================================
    // CARREGAMENTO DE DADOS DO USUÁRIO
    // ===============================================

    loadUserProfile() {
        if (!this.currentUser) {
            console.error('❌ Dados do usuário não disponíveis');
            return;
        }

        console.log('📊 Carregando perfil do usuário:', this.currentUser);

        // 🎯 HEADER DO PERFIL (USANDO CAMPOS CORRETOS)
        const profileTitle = document.getElementById('profilePageTitle');
        if (profileTitle) {
            profileTitle.textContent = `Perfil de ${this.currentUser.nome_usuario || 'Usuário'}`;
        }

        const profileName = document.getElementById('profileName');
        if (profileName) {
            profileName.textContent = this.currentUser.nome_usuario || 'Nome não disponível';
        }

        const profileRole = document.getElementById('profileRole');
        if (profileRole) {
            profileRole.textContent = this.currentUser.permissao || 'Visitante';
        }

        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            // ✅ USAR MÉTODO DO AUTHMANAGER QUE AGORA EXISTE
            profileAvatar.textContent = window.authManager.getPermissionIcon(this.currentUser.permissao);
        }

        // 📋 FORMULÁRIO DE INFORMAÇÕES PESSOAIS (CAMPOS CORRETOS)
        const editUsername = document.getElementById('editUsername');
        if (editUsername) {
            editUsername.value = this.currentUser.nome_usuario || '';
        }

        const editEmail = document.getElementById('editEmail');
        if (editEmail) {
            editEmail.value = this.currentUser.email || '';
        }

        const editPhone = document.getElementById('editPhone');
        if (editPhone) {
            editPhone.value = this.currentUser.celular || '';
        }

        const editFunction = document.getElementById('editFunction');
        if (editFunction) {
            editFunction.value = this.currentUser.funcao || '';
        }

        const editPermission = document.getElementById('editPermission');
        if (editPermission) {
            editPermission.value = this.currentUser.permissao || 'Visitante';
            editPermission.disabled = true; // Permissão não pode ser alterada pelo próprio usuário
        }

        // 📊 INFORMAÇÕES DA CONTA
        const accountCreated = document.getElementById('accountCreated');
        if (accountCreated) {
            if (this.currentUser.data_criacao) {
                const createdDate = new Date(this.currentUser.data_criacao);
                accountCreated.textContent = createdDate.toLocaleDateString('pt-BR');
            } else {
                accountCreated.textContent = 'N/A';
            }
        }

        const lastLogin = document.getElementById('lastLogin');
        if (lastLogin) {
            if (this.currentUser.ultimo_login) {
                const loginDate = new Date(this.currentUser.ultimo_login);
                lastLogin.textContent = loginDate.toLocaleString('pt-BR');
            } else {
                lastLogin.textContent = 'Primeiro acesso';
            }
        }

        const accountStatus = document.getElementById('accountStatus');
        if (accountStatus) {
            accountStatus.textContent = this.currentUser.status || 'Ativo';
            accountStatus.className = `badge badge-${this.getStatusClass(this.currentUser.status)}`;
        }

        console.log('✅ Perfil carregado com sucesso');
    }

    // ===============================================
    // EVENT LISTENERS
    // ===============================================

    setupEventListeners() {
        console.log('🎛️ Configurando event listeners...');

        // 📝 FORMULÁRIO DE INFORMAÇÕES PESSOAIS
        const personalForm = document.getElementById('personalForm');
        if (personalForm) {
            personalForm.addEventListener('submit', (e) => this.updatePersonalInfo(e));
        }

        // 🔒 FORMULÁRIO DE MUDANÇA DE SENHA
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.changePassword(e));
        }

        // ✅ VALIDAÇÃO DE CONFIRMAÇÃO DE SENHA
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }

        console.log('✅ Event listeners configurados');
    }

    // ===============================================
    // ATUALIZAÇÃO DE INFORMAÇÕES PESSOAIS
    // ===============================================

    async updatePersonalInfo(e) {
        e.preventDefault();
        
        const button = e.target.querySelector('button[type="submit"]');
        const spinner = document.getElementById('personalSpinner');
        const messageDiv = document.getElementById('personalMessage');
        
        try {
            // 🔄 MOSTRAR LOADING
            if (button) button.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
            
            // 📋 COLETAR DADOS DO FORMULÁRIO (CAMPOS CORRETOS)
            const formData = new FormData(e.target);
            const userData = {
                nome_usuario: formData.get('username'), // ✅ Campo correto
                email: formData.get('email'),
                celular: formData.get('phone'),         // ✅ Campo correto
                funcao: formData.get('function')
            };

            console.log('📤 Enviando dados:', userData);

            // 🌐 CHAMAR API
            const response = await window.conductorAPI.put(`/users/${this.currentUser.id}`, userData);
            
            if (response && response.success) {
                // ✅ SUCESSO - ATUALIZAR DADOS LOCAIS
                Object.assign(this.currentUser, userData);
                window.authManager.updateCurrentUser(this.currentUser);
                
                this.showMessage(messageDiv, 'Informações atualizadas com sucesso!', 'success');
                this.loadUserProfile(); // Refresh display
                
                console.log('✅ Informações atualizadas com sucesso');
            } else {
                throw new Error(response?.message || 'Erro desconhecido');
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar informações:', error);
            this.showMessage(messageDiv, `Erro ao atualizar informações: ${error.message}`, 'error');
        } finally {
            // 🔄 OCULTAR LOADING
            if (button) button.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    }

    // ===============================================
    // MUDANÇA DE SENHA
    // ===============================================

    async changePassword(e) {
        e.preventDefault();
        
        const button = e.target.querySelector('button[type="submit"]');
        const spinner = document.getElementById('passwordSpinner');
        const messageDiv = document.getElementById('passwordMessage');
        
        const currentPasswordEl = document.getElementById('currentPassword');
        const newPasswordEl = document.getElementById('newPassword');
        const confirmPasswordEl = document.getElementById('confirmPassword');

        if (!currentPasswordEl || !newPasswordEl || !confirmPasswordEl) {
            console.error('❌ Elementos de senha não encontrados');
            return;
        }

        const currentPassword = currentPasswordEl.value;
        const newPassword = newPasswordEl.value;
        const confirmPassword = confirmPasswordEl.value;

        // ✅ VALIDAÇÃO LOCAL
        if (newPassword !== confirmPassword) {
            this.showMessage(messageDiv, 'As senhas não coincidem!', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showMessage(messageDiv, 'A nova senha deve ter pelo menos 6 caracteres!', 'error');
            return;
        }

        try {
            // 🔄 MOSTRAR LOADING
            if (button) button.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
            
            const passwordData = {
                current_password: currentPassword,
                new_password: newPassword
            };

            console.log('🔒 Alterando senha...');

            // 🌐 CHAMAR API
            const response = await window.conductorAPI.put(`/users/${this.currentUser.id}/password`, passwordData);
            
            if (response && response.success) {
                this.showMessage(messageDiv, 'Senha alterada com sucesso!', 'success');
                
                // 🔄 LIMPAR FORMULÁRIO
                const passwordForm = document.getElementById('passwordForm');
                if (passwordForm) passwordForm.reset();
                
                console.log('✅ Senha alterada com sucesso');
            } else {
                throw new Error(response?.message || 'Erro desconhecido');
            }
            
        } catch (error) {
            console.error('❌ Erro ao alterar senha:', error);
            this.showMessage(messageDiv, `Erro ao alterar senha: ${error.message}`, 'error');
        } finally {
            // 🔄 OCULTAR LOADING
            if (button) button.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    }

    // ===============================================
    // VALIDAÇÃO DE CONFIRMAÇÃO DE SENHA
    // ===============================================

    validatePasswordMatch() {
        const newPasswordEl = document.getElementById('newPassword');
        const confirmPasswordEl = document.getElementById('confirmPassword');
        const matchIndicator = document.getElementById('passwordMatchIndicator');
        
        if (!newPasswordEl || !confirmPasswordEl) return;

        const newPassword = newPasswordEl.value;
        const confirmPassword = confirmPasswordEl.value;
        
        if (matchIndicator) {
            if (confirmPassword.length === 0) {
                matchIndicator.textContent = '';
                matchIndicator.className = '';
            } else if (newPassword === confirmPassword) {
                matchIndicator.textContent = '✅ Senhas coincidem';
                matchIndicator.className = 'text-success small';
            } else {
                matchIndicator.textContent = '❌ Senhas não coincidem';
                matchIndicator.className = 'text-danger small';
            }
        }
    }

    // ===============================================
    // CARREGAMENTO DE ATIVIDADE DO USUÁRIO
    // ===============================================

    async loadUserActivity() {
        try {
            console.log('📊 Carregando atividade do usuário...');
            
            // 🌐 BUSCAR LOGS DO USUÁRIO
            const response = await window.conductorAPI.get('/logs');
            
            if (response && response.success && response.data) {
                // 🔍 FILTRAR LOGS DO USUÁRIO ATUAL
                const userLogs = response.data.filter(log => 
                    log.usuario_id === this.currentUser.id
                ).slice(0, 10); // Últimas 10 atividades

                this.renderUserActivity(userLogs);
                console.log('✅ Atividade carregada:', userLogs.length, 'logs');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar atividade:', error);
        }
    }

    renderUserActivity(logs) {
        const activityList = document.getElementById('userActivityList');
        if (!activityList) return;

        if (logs.length === 0) {
            activityList.innerHTML = '<div class="text-center text-muted">Nenhuma atividade recente</div>';
            return;
        }

        activityList.innerHTML = logs.map(log => `
            <div class="activity-item border-bottom py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${this.getActionName(log.acao)}</strong>
                        <div class="text-muted small">${log.detalhes || 'Sem detalhes'}</div>
                    </div>
                    <div class="text-muted small">
                        ${new Date(log.data_criacao).toLocaleString('pt-BR')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ===============================================
    // MÉTODOS AUXILIARES
    // ===============================================

    getPermissionIcon(permissao) {
        const icons = {
            'Visitante': '👁️',
            'Usuario': '👤',
            'Operador': '⚙️',
            'Administrador': '🛡️',
            'Desenvolvedor': '💻'
        };
        return icons[permissao] || '👤';
    }

    getStatusClass(status) {
        const classes = {
            'Ativo': 'success',
            'Inativo': 'secondary',
            'Bloqueado': 'danger'
        };
        return classes[status] || 'secondary';
    }

    getActionName(action) {
        const actionNames = {
            'user_login': 'Login realizado',
            'user_logout': 'Logout realizado',
            'user_updated': 'Perfil atualizado',
            'password_changed': 'Senha alterada',
            'user_created': 'Usuário criado',
            'user_promoted': 'Usuário promovido',
            'user_demoted': 'Usuário rebaixado',
            'user_activated': 'Usuário ativado',
            'user_deactivated': 'Usuário desativado',
            'key_created': 'Chave criada',
            'key_used': 'Chave utilizada',
            'key_deleted': 'Chave excluída',
            'system_check': 'Verificação do sistema',
            'export_keys': 'Relatório exportado'
        };
        return actionNames[action] || action;
    }

    showMessage(element, message, type) {
        if (!element) return;
        
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        };

        element.innerHTML = `
            <div class="alert ${alertClass[type]} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // 🔄 AUTO-HIDE APÓS 5 SEGUNDOS
        setTimeout(() => {
            if (element.firstElementChild) {
                element.firstElementChild.remove();
            }
        }, 5000);
    }

} // FIM DA CLASSE ProfileManager

// ===============================================
// INICIALIZAÇÃO GLOBAL
// ===============================================

// 🚀 INSTÂNCIA GLOBAL DO PROFILE MANAGER
window.profileManager = new ProfileManager();

// 🔄 LOG DE INICIALIZAÇÃO
console.log('🎼 CONDUCTOR - Profile Manager carregado!');