// ===============================================
// CONDUCTOR - API CLIENT COMPLETO E CORRIGIDO
// frontend/js/utils/api.js
// TODAS AS 4 FASES IMPLEMENTADAS
// ===============================================

class ConductorAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = this.loadToken();
        this.refreshPromise = null; // ✅ FASE 3: Prevenir múltiplos refresh simultâneos
        
        console.log('🚀 ConductorAPI inicializado');
    }

    // ===============================================
    // GERENCIAMENTO DE TOKEN - FASE 1 & 3
    // ===============================================

    loadToken() {
        try {
            return localStorage.getItem('conductor_token');
        } catch (error) {
            console.error('❌ Erro ao carregar token:', error);
            return null;
        }
    }

    setToken(token) {
        try {
            this.token = token;
            localStorage.setItem('conductor_token', token);
            console.log('✅ Token definido');
        } catch (error) {
            console.error('❌ Erro ao salvar token:', error);
        }
    }

    // ✅ FASE 3: Método renomeado baseado no Doc III
    removeToken() {
        try {
            this.token = null;
            localStorage.removeItem('conductor_token');
            localStorage.removeItem('conductor_user');
            console.log('✅ Token removido');
        } catch (error) {
            console.error('❌ Erro ao remover token:', error);
        }
    }

    isAuthenticated() {
        return !!this.token;
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

    // ===============================================
    // REQUEST BASE COM RETRY E ERROR HANDLING - FASE 1 & 4
    // ===============================================

    async request(endpoint, config = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        // ✅ FASE 2: Headers padronizados
        const defaultConfig = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };

        // ✅ FASE 1: Adicionar token se autenticado e não for explicitamente público
        if (this.token && config.auth !== false) {
            defaultConfig.headers['Authorization'] = `Bearer ${this.token}`;
        }

        const finalConfig = { ...defaultConfig, ...config };

        // ✅ FASE 4: Merge headers corretamente
        if (config.headers) {
            finalConfig.headers = { ...defaultConfig.headers, ...config.headers };
        }

        try {
            console.log(`🔄 ${finalConfig.method} ${url}`);
            
            const response = await fetch(url, finalConfig);
            
            // ✅ FASE 3: Handle 401 com refresh token
            if (response.status === 401 && this.token && !endpoint.includes('/auth/')) {
                console.log('🔄 Token expirado, tentando renovar...');
                const refreshSuccess = await this.handleTokenRefresh();
                
                if (refreshSuccess) {
                    // Retry request com novo token
                    finalConfig.headers['Authorization'] = `Bearer ${this.token}`;
                    const retryResponse = await fetch(url, finalConfig);
                    return await this.handleResponse(retryResponse, url, finalConfig.method);
                } else {
                    // Refresh falhou, redirecionar para login
                    this.handleAuthFailure();
                    throw new Error('Sessão expirada');
                }
            }

            return await this.handleResponse(response, url, finalConfig.method);

        } catch (error) {
            console.error(`❌ ${finalConfig.method || 'GET'} ${url} - Erro:`, error);
            
            // ✅ CORREÇÃO: Debug adicional para erro 502
            if (error.message.includes('502')) {
                console.error('🔍 Debug 502 - Verificações sugeridas:');
                console.error('   1. Backend está rodando? (npm run start:dev)');
                console.error('   2. Porta 3000 está acessível?');
                console.error('   3. Nginx proxy está configurado?');
                console.error('   4. Docker containers estão running?');
            }
            
            throw error;
        }
    }

    // ✅ FASE 2: Response handler padronizado
    async handleResponse(response, url, method) {
        try {
            // ✅ FASE 4: Melhor handling de diferentes content types
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                // ✅ FASE 4: Mensagens de erro mais específicas
                const errorMessage = this.getErrorMessage(response.status, data);
                throw new Error(errorMessage);
            }

            console.log(`✅ ${method} ${url} - Sucesso`);
            return data;

        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Erro de conexão. Verifique se o backend está rodando na porta 3000.');
            }
            if (error.message.includes('NetworkError')) {
                throw new Error('Erro de rede. Verifique sua conexão com a internet.');
            }
            throw error;
        }
    }

    // ✅ FASE 4: Mensagens de erro amigáveis
    getErrorMessage(status, data) {
        const defaultMessages = {
            400: 'Dados inválidos enviados',
            401: 'Acesso não autorizado',
            403: 'Permissão insuficiente',
            404: 'Recurso não encontrado',
            409: 'Conflito - dados já existem',
            429: 'Muitas tentativas. Tente novamente em alguns minutos.',
            500: 'Erro interno do servidor',
            502: 'Servidor indisponível. Verifique se o backend está rodando.',
            503: 'Serviço temporariamente indisponível',
            504: 'Timeout do servidor',
        };

        // Usar mensagem específica do servidor se disponível
        if (data && typeof data === 'object' && data.message) {
            return data.message;
        }

        return defaultMessages[status] || `Erro ${status}`;
    }

    // ===============================================
    // TOKEN REFRESH - FASE 3
    // ===============================================

    async handleTokenRefresh() {
        if (this.refreshPromise) {
            return await this.refreshPromise;
        }

        this.refreshPromise = this.performTokenRefresh();
        const result = await this.refreshPromise;
        this.refreshPromise = null;
        
        return result;
    }

    async performTokenRefresh() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: this.token }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.access_token) {
                    this.setToken(data.access_token);
                    if (data.user) {
                        localStorage.setItem('conductor_user', JSON.stringify(data.user));
                    }
                    console.log('✅ Token renovado com sucesso');
                    return true;
                }
            }

            console.log('❌ Falha na renovação do token');
            return false;

        } catch (error) {
            console.error('❌ Erro na renovação do token:', error);
            return false;
        }
    }

    handleAuthFailure() {
        console.log('🚪 Redirecionando para login devido à falha de autenticação');
        this.removeToken();
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    // ===============================================
    // MÉTODOS HTTP - FASE 2
    // ===============================================

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
    // MÉTODOS DE AUTENTICAÇÃO - FASE 1
    // ===============================================

    async login(credentials) {
        try {
            console.log('🔐 Tentando login...');
            
            // ✅ CORREÇÃO: Verificar conectividade antes do login
            const backendOnline = await this.checkBackendHealth();
            if (!backendOnline) {
                throw new Error('Backend não está acessível. Verifique se o servidor está rodando.');
            }
            
            // ✅ FASE 2: Backend espera nome_usuario (solução do Doc III)
            const loginData = {
                nome_usuario: credentials.username,
                senha: credentials.password
            };
            
            const response = await this.post('/auth/login', loginData, { auth: false });
            
            // ✅ FASE 2: Backend retorna { success, access_token, user }
            if (response && response.success && response.access_token) {
                this.setToken(response.access_token);
                localStorage.setItem('conductor_user', JSON.stringify(response.user));
                
                console.log('✅ Login realizado com sucesso:', response.user.nome_usuario);
                return response;
            } else {
                throw new Error(response.message || 'Falha no login');
            }
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.post('/auth/register', userData, { auth: false });
            return response;
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            throw error;
        }
    }

    // ✅ FASE 1: Validação de token implementada
    async validateToken() {
        try {
            if (!this.token) {
                return null;
            }

            const response = await this.get('/auth/validate');
            
            // ✅ FASE 2: Verificar estrutura da resposta (solução do Doc III)
            if (response && response.success && response.user) {
                // Atualizar dados do usuário
                localStorage.setItem('conductor_user', JSON.stringify(response.user));
                return response.user;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Token inválido:', error);
            return null;
        }
    }

    // ✅ FASE 3: Logout com invalidação backend
    async logout() {
        try {
            if (this.token) {
                await this.post('/auth/logout', {});
            }
        } catch (error) {
            console.warn('⚠️ Erro no logout backend:', error);
        } finally {
            this.removeToken();
            console.log('✅ Logout realizado');
        }
    }

    // ===============================================
    // MÉTODOS DE USUÁRIOS - FASE 1 & 2
    // ===============================================

    async getUsers(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            // ✅ FASE 4: Suporte a filtros
            if (filters.search) params.append('search', filters.search);
            if (filters.permission) params.append('permission', filters.permission);
            if (filters.status) params.append('status', filters.status);
            if (filters.limit) params.append('limit', filters.limit);
            if (filters.offset) params.append('offset', filters.offset);

            const endpoint = params.toString() ? `/users?${params}` : '/users';
            const response = await this.get(endpoint);
            
            // ✅ FASE 2: Padronização de resposta (solução do Doc III)
            return response?.success ? response : { success: true, data: response || [] };
        } catch (error) {
            console.error('❌ Erro ao buscar usuários:', error);
            return { success: false, data: [], message: error.message };
        }
    }

    async getUser(id) {
        try {
            const response = await this.get(`/users/${id}`);
            return response?.success ? response : { success: true, data: response };
        } catch (error) {
            console.error(`❌ Erro ao buscar usuário ${id}:`, error);
            return { success: false, data: null, message: error.message };
        }
    }

    async createUser(userData) {
        try {
            const response = await this.post('/users', userData);
            return response;
        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            throw error;
        }
    }

    async updateUser(id, userData) {
        try {
            const response = await this.put(`/users/${id}`, userData);
            return response;
        } catch (error) {
            console.error(`❌ Erro ao atualizar usuário ${id}:`, error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const response = await this.delete(`/users/${id}`);
            return response;
        } catch (error) {
            console.error(`❌ Erro ao deletar usuário ${id}:`, error);
            throw error;
        }
    }

    // ✅ FASE 4: Estatísticas de usuários
    async getUserStats() {
        try {
            const response = await this.get('/users/stats/summary');
            return response?.success ? response.data : {};
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return {
                total: 0,
                ativos: 0,
                inativos: 0,
                por_permissao: {}
            };
        }
    }

    // ===============================================
    // MÉTODOS DE CHAVES - FASE 1
    // ===============================================

    async getKeys() {
        try {
            const response = await this.get('/chaves');
            return response?.success ? response : { success: true, data: response || [] };
        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error);
            return { success: false, data: [], message: error.message };
        }
    }

    async createKey(keyData) {
        try {
            const response = await this.post('/chaves', keyData);
            return response;
        } catch (error) {
            console.error('❌ Erro ao criar chave:', error);
            throw error;
        }
    }

    async validateKey(key) {
        try {
            const response = await this.post('/chaves/validate', { chave: key }, { auth: false });
            return response;
        } catch (error) {
            console.error('❌ Erro ao validar chave:', error);
            throw error;
        }
    }

    // ===============================================
    // MÉTODOS DE LOGS - FASE 1 (MOCK PARA DESENVOLVIMENTO)
    // ===============================================

    async getLogs() {
        try {
            // Tentar endpoint real primeiro
            const response = await this.get('/logs');
            return response?.success ? response : { success: true, data: response || [] };
        } catch (error) {
            console.warn('⚠️ Endpoint de logs não disponível, retornando dados mock');
            return {
                success: true,
                data: this.generateMockLogs(),
                message: 'Dados mock - endpoint em desenvolvimento'
            };
        }
    }

    // ✅ FASE 4: Logs mock para desenvolvimento
    generateMockLogs() {
        const currentUser = this.getCurrentUser();
        const now = new Date();
        
        return [
            {
                id: 1,
                timestamp: new Date(now - 1800000).toISOString(),
                type: 'auth',
                user: currentUser?.nome_usuario || 'admin',
                action: 'login',
                details: 'Login realizado com sucesso',
                ip: '192.168.1.100'
            },
            {
                id: 2,
                timestamp: new Date(now - 3600000).toISOString(),
                type: 'user',
                user: 'admin',
                action: 'create_user',
                details: 'Novo usuário criado: testuser',
                ip: '192.168.1.100'
            },
            {
                id: 3,
                timestamp: new Date(now - 7200000).toISOString(),
                type: 'system',
                user: 'system',
                action: 'backup',
                details: 'Backup automático realizado',
                ip: '127.0.0.1'
            }
        ];
    }

    // ===============================================
    // MÉTODOS DE SISTEMA - FASE 4
    // ===============================================

    // ✅ CORREÇÃO: Verificação de conectividade do backend
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.baseURL}/auth/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Timeout mais curto para verificação rápida
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend conectado:', data);
                return true;
            } else {
                console.warn('⚠️ Backend respondeu com erro:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Backend não acessível:', error.message);
            return false;
        }
    }

    async getSystemStats() {
        try {
            const [userStats, systemInfo] = await Promise.all([
                this.getUserStats(),
                this.getSystemInfo()
            ]);

            return {
                users: userStats,
                system: systemInfo,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas do sistema:', error);
            return {
                users: { total: 0, ativos: 0, inativos: 0 },
                system: { status: 'unknown' }
            };
        }
    }

    async getSystemInfo() {
        try {
            const response = await this.get('/auth/health');
            return response?.success ? response : { status: 'ok' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    // ===============================================
    // UTILITÁRIOS - FASE 4
    // ===============================================

    // Rate limiting client-side para melhorar UX
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Retry automático para requests que falharam
    async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                
                console.log(`⏳ Tentativa ${i + 1} falhou, tentando novamente em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
}

// ===============================================
// INSTÂNCIA GLOBAL E SETUP
// ===============================================

// Criar instância global
window.conductorAPI = new ConductorAPI();

// Auto-setup de interceptors para debugging em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.conductorAPI.debugMode = true;
    console.log('🔍 Modo debug ativado para desenvolvimento');
}

console.log('🎼 CONDUCTOR API carregado e configurado!');