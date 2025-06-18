// API UTILS - CONDUCTOR
class ConductorAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('conductor_token');
    }

    // Headers padrão
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Fazer requisição genérica
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Se token expirou, redirecionar para login
            if (response.status === 401) {
                this.logout();
                return null;
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Métodos HTTP específicos
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

    // Métodos de autenticação
    async login(credentials) {
        const response = await this.post('/auth/login', credentials, { auth: false });
        if (response && response.access_token) {
            this.setToken(response.access_token);
            localStorage.setItem('conductor_user', JSON.stringify(response.user));
        }
        return response;
    }

    async register(userData) {
        return this.post('/auth/register', userData, { auth: false });
    }

    async getProfile() {
        return this.get('/auth/profile');
    }

    async validateToken() {
        try {
            return await this.get('/auth/profile');
        } catch (error) {
            return null;
        }
    }

    // Métodos de usuários
    async getUsers() {
        return this.get('/users');
    }

    async getUser(id) {
        return this.get(`/users/${id}`);
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(id, userData) {
        return this.put(`/users/${id}`, userData);
    }

    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    }

    // Métodos de sistema
    async getSystemStatus() {
        return this.get('/system/status');
    }

    async getSystemStats() {
        return this.get('/system/stats');
    }

    // Gerenciamento de token
    setToken(token) {
        this.token = token;
        localStorage.setItem('conductor_token', token);
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('conductor_token');
        localStorage.removeItem('conductor_user');
    }

    // Logout
    logout() {
        this.removeToken();
        window.location.href = 'login.html';
    }

    // Verificar se está autenticado
    isAuthenticated() {
        return !!this.token;
    }

    // Obter usuário atual
    getCurrentUser() {
        const userStr = localStorage.getItem('conductor_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Verificar permissões
    hasPermission(requiredPermission) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
        const userLevel = permissions.indexOf(user.permissao);
        const requiredLevel = permissions.indexOf(requiredPermission);

        return userLevel >= requiredLevel;
    }

    // Verificar se é admin
    isAdmin() {
        return this.hasPermission('Administrador');
    }

    // Verificar se é desenvolvedor
    isDeveloper() {
        return this.hasPermission('Desenvolvedor');
    }
}

// Instância global da API
window.conductorAPI = new ConductorAPI();