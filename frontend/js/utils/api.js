class ConductorAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = this.loadToken();
        this.refreshPromise = null;
        
        console.log('🚀 ConductorAPI inicializado');
    }

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
            console.error('❌ Erro ao carregar usuário:', error);
            return null;
        }
    }

    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token && options.auth !== false) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            
            if (response.status === 401 && this.token && !endpoint.includes('/auth/refresh')) {
                console.warn('⚠️ Token expirado, tentando renovar...');
                
                if (!this.refreshPromise) {
                    this.refreshPromise = this.refreshToken();
                }
                
                const refreshResult = await this.refreshPromise;
                this.refreshPromise = null;
                
                if (refreshResult.success) {
                    config.headers.Authorization = `Bearer ${this.token}`;
                    return await fetch(`${this.baseURL}${endpoint}`, config);
                } else {
                    this.removeToken();
                    window.location.href = '/login.html';
                    throw new Error('Sessão expirada');
                }
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`❌ Erro na requisição ${endpoint}:`, error);
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

    async login(credentials) {
        try {
            console.log('🔐 Tentando login...');
            
            const backendOnline = await this.checkBackendHealth();
            if (!backendOnline) {
                throw new Error('Backend não está acessível. Verifique se o servidor está rodando.');
            }
            
            const loginData = {
                nome_usuario: credentials.username,
                senha: credentials.password
            };
            
            const response = await this.post('/auth/login', loginData, { auth: false });
            
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
            console.log('📝 Registrando usuário:', userData.nome_usuario);
            
            const requestData = {
                nome_usuario: userData.nome_usuario,
                email: userData.email,
                senha: userData.senha,
                funcao: userData.funcao,
            };

            if (userData.celular) {
                requestData.celular = userData.celular;
            }
            
            if (userData.chave_acesso) {
                requestData.chave_acesso = userData.chave_acesso;
            }

            const response = await this.post('/auth/register', requestData, { auth: false });
            
            if (response && response.success) {
                console.log('✅ Usuário registrado:', response.data);
                return response;
            } else {
                throw new Error(response.message || 'Erro no registro');
            }
        } catch (error) {
            console.error('❌ Erro no registro:', error);
            throw error;
        }
    }

    async validateKey(chaveCode) {
        try {
            console.log('🔑 [API] Validando chave:', chaveCode);
            
            if (!chaveCode || typeof chaveCode !== 'string' || !chaveCode.trim()) {
                return {
                    success: false,
                    isValid: false,
                    message: 'Chave não fornecida',
                };
            }

            const response = await fetch(`${this.baseURL}/chaves/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chave: chaveCode.trim() }),
            });

            const data = await response.json();
            
            if (response.ok && data) {
                return {
                    success: data.success || false,
                    isValid: data.isValid || false,
                    permission: data.permission || null,
                    message: data.message || 'Validação concluída',
                };
            } else {
                return {
                    success: false,
                    isValid: false,
                    message: data?.message || 'Erro na validação',
                };
            }
        } catch (error) {
            console.error('❌ [API] Erro na validação da chave:', error);
            return {
                success: false,
                isValid: false,
                message: 'Erro de conexão ao validar chave',
            };
        }
    }

    async logout() {
        try {
            if (this.token) {
                await this.post('/auth/logout');
            }
        } catch (error) {
            console.error('❌ Erro no logout:', error);
        } finally {
            this.removeToken();
            console.log('✅ Logout realizado');
        }
    }

    async validateToken() {
        try {
            if (!this.token) {
                return { success: false, message: 'Token não encontrado' };
            }

            const response = await this.post('/auth/validate', { token: this.token });
            return response;
        } catch (error) {
            console.error('❌ Erro na validação do token:', error);
            return { success: false, message: 'Token inválido' };
        }
    }

    async refreshToken() {
        try {
            if (!this.token) {
                throw new Error('Nenhum token para renovar');
            }

            const response = await this.post('/auth/refresh', { token: this.token });
            
            if (response.success && response.access_token) {
                this.setToken(response.access_token);
                return { success: true };
            } else {
                throw new Error('Falha ao renovar token');
            }
        } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            return { success: false, error: error.message };
        }
    }

    async getUsers(filters = {}) {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            const endpoint = params.toString() ? `/users?${params}` : '/users';
            const response = await this.get(endpoint);
            
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

    async updateKey(id, keyData) {
        try {
            const response = await this.put(`/chaves/${id}`, keyData);
            return response;
        } catch (error) {
            console.error(`❌ Erro ao atualizar chave ${id}:`, error);
            throw error;
        }
    }

    async deleteKey(id) {
        try {
            const response = await this.delete(`/chaves/${id}`);
            return response;
        } catch (error) {
            console.error(`❌ Erro ao deletar chave ${id}:`, error);
            throw error;
        }
    }

    async getLogs() {
        try {
            const response = await this.get('/logs');
            return response?.success ? response : { success: true, data: response || [] };
        } catch (error) {
            console.error('❌ Erro ao buscar logs:', error);
            return { success: false, data: [], message: error.message };
        }
    }

    async getSystemStats() {
        try {
            const currentUser = this.getCurrentUser();
            
            if (!currentUser || !['Administrador', 'Desenvolvedor'].includes(currentUser.permissao)) {
                return {
                    totalUsers: 'N/A',
                    onlineUsers: '1',
                    uptime: 'N/A'
                };
            }

            const [userStats, systemInfo] = await Promise.all([
                this.getUserStats(),
                this.getSystemInfo()
            ]);

            return {
                totalUsers: userStats.total || 0,
                onlineUsers: userStats.ativos || 0,
                uptime: systemInfo.uptime || 'N/A',
                users: userStats,
                system: systemInfo,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas do sistema:', error);
            return {
                totalUsers: 'N/A',
                onlineUsers: '1',
                uptime: 'N/A'
            };
        }
    }

    async getSystemInfo() {
        try {
            const response = await this.get('/auth/health');
            return response?.success ? response : { status: 'unknown' };
        } catch (error) {
            console.error('❌ Erro ao buscar informações do sistema:', error);
            return { status: 'error' };
        }
    }

    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.baseURL}/auth/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
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

    getMockLogs() {
        const now = new Date();
        return [
            {
                id: 1,
                timestamp: new Date(now - 3600000).toISOString(),
                type: 'auth',
                user: 'devargon',
                action: 'login',
                details: 'Login realizado com sucesso',
                ip: '192.168.1.10'
            },
            {
                id: 2,
                timestamp: new Date(now - 1800000).toISOString(),
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
}

if (typeof window !== 'undefined') {
    window.conductorAPI = new ConductorAPI();
}