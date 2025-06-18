// PROFILE PAGE CONTROLLER
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Proteger página
        const isAuth = await protectPage();
        if (!isAuth) return;

        this.loadUserData();
        this.setupEventListeners();
    }

    async loadUserData() {
        this.currentUser = authManager.getCurrentUser();
        
        if (this.currentUser) {
            // Preencher header
            document.getElementById('profileName').textContent = this.currentUser.nome_usuario;
            document.getElementById('profileRole').textContent = this.currentUser.permissao;
            document.getElementById('profileAvatar').textContent = authManager.getPermissionIcon(this.currentUser.permissao);

            // Preencher formulário
            document.getElementById('editUsername').value = this.currentUser.nome_usuario;
            document.getElementById('editEmail').value = this.currentUser.email || '';
            document.getElementById('editPhone').value = this.currentUser.telefone || '';
            document.getElementById('editFunction').value = this.currentUser.funcao || '';
            document.getElementById('editPermission').value = this.currentUser.permissao;

            // Carregar estatísticas
            this.loadUserStats();
        }
    }

    setupEventListeners() {
        // Formulário de informações pessoais
        document.getElementById('personalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePersonalInfo();
        });

        // Formulário de senha
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });
    }

    async updatePersonalInfo() {
        const formData = new FormData(document.getElementById('personalForm'));
        const data = Object.fromEntries(formData);

        try {
            const response = await conductorAPI.put(`/users/${this.currentUser.id}`, data);
            
            if (response.success) {
                this.showMessage('personalMessage', 'Informações atualizadas com sucesso!', 'success');
                
                // Atualizar dados locais
                await conductorAPI.refreshUserData();
                this.loadUserData();
            }
        } catch (error) {
            this.showMessage('personalMessage', 'Erro ao atualizar informações: ' + error.message, 'error');
        }
    }

    async updatePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showMessage('passwordMessage', 'As senhas não coincidem!', 'error');
            return;
        }

        if (newPassword.length < 3) {
            this.showMessage('passwordMessage', 'A nova senha deve ter pelo menos 3 caracteres!', 'error');
            return;
        }

        try {
            const response = await conductorAPI.put(`/users/${this.currentUser.id}/password`, {
                currentPassword,
                newPassword
            });

            if (response.success) {
                this.showMessage('passwordMessage', 'Senha alterada com sucesso!', 'success');
                this.resetPasswordForm();
            }
        } catch (error) {
            this.showMessage('passwordMessage', 'Erro ao alterar senha: ' + error.message, 'error');
        }
    }

    showMessage(elementId, message, type) {
        const messageEl = document.getElementById(elementId);
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }

    loadUserStats() {
        // Por enquanto, dados mockados
        document.getElementById('userLoginCount').textContent = '1';
        document.getElementById('userLastLogin').textContent = 'Agora';
        
        // Calcular dias desde criação da conta
        if (this.currentUser.created_at) {
            const created = new Date(this.currentUser.created_at);
            const now = new Date();
            const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
            document.getElementById('userAccountAge').textContent = days;
        }
    }
}

// Funções globais
function resetPersonalForm() {
    window.profileManager.loadUserData();
}

function resetPasswordForm() {
    document.getElementById('passwordForm').reset();
}

function goBack() {
    window.location.href = 'dashboard.html';
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});