// ===============================================
// CONDUCTOR - API UTILS RESTAURADO (FUNCIONANDO)
// frontend/js/utils/api.js
// ===============================================

class ConductorAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('conductor_token');
        console.log('🌐 ConductorAPI inicializado:', this.baseURL);
    }

    // ===============================================
    // GERENCIAMENTO DE TOKEN
    // ===============================================

    setToken(token) {
        this.token = token;
        localStorage.setItem('conductor_token', token);
        console.log('🔑 Token salvo');
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('conductor_token');
        localStorage.removeItem('conductor_user');
        console.log('🧹 Token removido');
    }

    hasToken() {
        return !!this.token;
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ===============================================
    // HEADERS E CONFIGURAÇÃO
    // ===============================================

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // ===============================================
    // MÉTODOS HTTP BÁSICOS
    // ===============================================

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        try {
            console.log(`🌐 ${config.method || 'GET'} ${url}`);
            const response = await fetch(url, config);
            
            // Se token expirou, fazer logout
            if (response.status === 401) {
                console.log('❌ Token expirado - fazendo logout');
                this.logout();
                return null;
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            console.log(`✅ ${config.method || 'GET'} ${url} - Sucesso`);
            return data;
        } catch (error) {
            console.error(`❌ ${config.method || 'GET'} ${url} - Erro:`, error);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'GET',
            ...options
        });
    }

    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    // ===============================================
    // MÉTODOS DE AUTENTICAÇÃO (ORIGINAL FUNCIONANDO)
    // ===============================================

    async login(credentials) {
        try {
            console.log('🔐 Tentando login...');
            
            // ✅ ORIGINAL - Backend espera nome_usuario
            const loginData = {
                nome_usuario: credentials.username,
                senha: credentials.password
            };
            
            const response = await this.post('/auth/login', loginData, { auth: false });
            
            // ✅ ORIGINAL - Backend retorna { access_token, user }
            if (response && response.access_token) {
                this.setToken(response.access_token);
                localStorage.setItem('conductor_user', JSON.stringify(response.user));
                
                console.log('✅ Login realizado com sucesso:', response.user.nome_usuario);
                return response;
            } else {
                throw new Error('Falha no login');
            }
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            console.log('📝 Tentando registrar usuário...');
            
            // ✅ ORIGINAL - Campos corretos do backend
            const registerData = {
                nome_usuario: userData.username,
                email: userData.email,
                senha: userData.password,
                funcao: userData.funcao || 'Estagiario',
                celular: userData.phone || null,
                chave_acesso: userData.accessKey || null
            };
            
            const response = await this.post('/auth/register', registerData, { auth: false });
            console.log('✅ Registro realizado:', response);
            return response;
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            throw error;
        }
    }

    async getProfile() {
        try {
            const response = await this.get('/auth/profile');
            return response;
        } catch (error) {
            console.error('❌ Erro ao obter perfil:', error);
            return null;
        }
    }

    async validateToken() {
        try {
            const profile = await this.getProfile();
            return profile?.user || null;
        } catch (error) {
            console.error('❌ Token inválido:', error);
            return null;
        }
    }

    // ===============================================
    // MÉTODOS DE USUÁRIOS
    // ===============================================

    async getUsers() {
        const response = await this.get('/users');
        return response?.success ? response.data : response || [];
    }

    async getUser(id) {
        const response = await this.get(`/users/${id}`);
        return response?.success ? response.data : response || null;
    }

    async createUser(userData) {
        const userPayload = {
            nome_usuario: userData.username,
            email: userData.email,
            senha: userData.password,
            funcao: userData.funcao,
            permissao: userData.permissao,
            celular: userData.phone || null
        };
        
        const response = await this.post('/users', userPayload);
        return response;
    }

    async updateUser(id, userData) {
        const userPayload = {
            nome_usuario: userData.username,
            email: userData.email,
            funcao: userData.funcao,
            permissao: userData.permissao,
            celular: userData.phone || null
        };
        
        const response = await this.put(`/users/${id}`, userPayload);
        return response;
    }

    async deleteUser(id) {
        const response = await this.delete(`/users/${id}`);
        return response;
    }

    async toggleUserStatus(id) {
        const response = await this.put(`/users/${id}/toggle-status`);
        return response;
    }

    // ===============================================
    // MÉTODOS DE CHAVES
    // ===============================================

    async getKeys() {
        try {
            const response = await this.get('/chaves');
            return response?.success ? response.data : response || [];
        } catch (error) {
            console.warn('❌ Erro ao carregar chaves:', error);
            return [];
        }
    }

    async createKey(keyData) {
        const response = await this.post('/chaves', keyData);
        return response;
    }

    async updateKey(id, keyData) {
        const response = await this.put(`/chaves/${id}`, keyData);
        return response;
    }

    async deleteKey(id) {
        const response = await this.delete(`/chaves/${id}`);
        return response;
    }

    async validateKey(key) {
        const response = await this.post('/chaves/validate', { chave: key }, { auth: false });
        return response;
    }

    // ===============================================
    // MÉTODOS DE LOGS
    // ===============================================

    async getLogs() {
        try {
            const response = await this.get('/logs');
            return response?.success ? response.data : response || [];
        } catch (error) {
            console.warn('❌ Erro ao carregar logs:', error);
            return [];
        }
    }

    async createLog(logData) {
        try {
            const response = await this.post('/logs', logData);
            return response;
        } catch (error) {
            console.error('❌ Erro ao criar log:', error);
            return null;
        }
    }

    // ===============================================
    // MÉTODOS DE SISTEMA
    // ===============================================

    async getSystemStats() {
        try {
            console.log('📊 Carregando estatísticas do sistema...');
            
            // 🔍 DEBUG - Vamos ver exatamente o que a API retorna
            const usersResponse = await this.getUsers();
            const keysResponse = await this.getKeys();
            
            console.log('🔍 DEBUG usersResponse:', usersResponse);
            console.log('🔍 DEBUG keysResponse:', keysResponse);
            console.log('🔍 Type usersResponse:', typeof usersResponse);
            console.log('🔍 Is Array usersResponse:', Array.isArray(usersResponse));
            
            // ✅ TENTAR MÚLTIPLAS FORMAS DE EXTRAIR OS DADOS
            let users = [];
            let keys = [];
            
            // Para usuários
            if (Array.isArray(usersResponse)) {
                users = usersResponse;
                console.log('✅ usersResponse é array direto');
            } else if (usersResponse?.data && Array.isArray(usersResponse.data)) {
                users = usersResponse.data;
                console.log('✅ usersResponse.data é array');
            } else if (usersResponse?.success && usersResponse.data && Array.isArray(usersResponse.data)) {
                users = usersResponse.data;
                console.log('✅ usersResponse.success.data é array');
            } else {
                console.warn('⚠️ Formato inesperado de usuários, usando array vazio');
                users = [];
            }
            
            // Para chaves
            if (Array.isArray(keysResponse)) {
                keys = keysResponse;
                console.log('✅ keysResponse é array direto');
            } else if (keysResponse?.data && Array.isArray(keysResponse.data)) {
                keys = keysResponse.data;
                console.log('✅ keysResponse.data é array');
            } else if (keysResponse?.success && keysResponse.data && Array.isArray(keysResponse.data)) {
                keys = keysResponse.data;
                console.log('✅ keysResponse.success.data é array');
            } else {
                console.warn('⚠️ Formato inesperado de chaves, usando array vazio');
                keys = [];
            }
            
            console.log('📊 Arrays finais:', { 
                usersCount: users.length, 
                keysCount: keys.length,
                sampleUser: users[0],
                sampleKey: keys[0]
            });
            
            // ✅ GARANTIR QUE SÃO ARRAYS ANTES DE FILTRAR
            if (!Array.isArray(users)) {
                console.error('❌ users não é array:', users);
                users = [];
            }
            
            if (!Array.isArray(keys)) {
                console.error('❌ keys não é array:', keys);
                keys = [];
            }
            
            // ✅ CALCULAR ESTATÍSTICAS COM FALLBACKS
            const stats = {
                totalUsers: users.length,
                activeUsers: users.filter(u => u?.status === 'Ativo').length,
                totalKeys: keys.length,
                activeKeys: keys.filter(k => k?.status === 'ativa').length,
                expiredKeys: keys.filter(k => k?.status === 'expirada').length,
                onlineUsers: 1,
                uptime: 'Sistema Online'
            };
            
            console.log('📊 Estatísticas calculadas:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ ERRO COMPLETO em getSystemStats:', error);
            console.error('❌ Stack trace:', error.stack);
            
            // ✅ RETORNO SEGURO EM CASO DE ERRO
            return {
                totalUsers: 0,
                activeUsers: 0,
                totalKeys: 0,
                activeKeys: 0,
                expiredKeys: 0,
                onlineUsers: 1,
                uptime: 'Erro'
            };
        }
    }

    // ===============================================
    // MÉTODOS AUXILIARES
    // ===============================================

    logout() {
        this.removeToken();
        window.location.href = '/login.html';
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('conductor_user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('❌ Erro ao obter usuário atual:', error);
            return null;
        }
    }

    hasPermission(requiredPermission) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        const userLevel = permissions.indexOf(user.permissao);
        const requiredLevel = permissions.indexOf(requiredPermission);

        return userLevel >= requiredLevel;
    }

    // ===============================================
    // MÉTODOS DE DEBUG
    // ===============================================

    async testConnection() {
        try {
            const response = await this.get('/users');
            console.log('✅ Conexão com API funcionando');
            return true;
        } catch (error) {
            console.error('❌ Erro na conexão com API:', error);
            return false;
        }
    }

} // FIM DA CLASSE ConductorAPI

// ===============================================
// INICIALIZAÇÃO GLOBAL
// ===============================================

window.conductorAPI = new ConductorAPI();
console.log('🌐 CONDUCTOR - API Manager (ORIGINAL) carregado!');