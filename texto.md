# CADERNO DE ERROS v0.4 - CONDUCTOR
## (Error tracking and resolution log)
## Última atualização: 2025-06-24 12:55:00

---

## ERROR LOG

| Erro | Data | Area | Resolução | Lição |
|------|------|------|-----------|-------|
| Loop infinito entre login e dashboard | 2025-06-23 17:30:00 | Frontend/Auth | Simplificado requireAuth() removendo validação automática de token | Validação de token deve ser opcional, não automática |
| Login não funcionava - preventDefault ausente | 2025-06-23 17:45:00 | Frontend/Login | Adicionado e.preventDefault() no início de handleLogin() | Sempre adicionar preventDefault() no início de form handlers |
| clearToken is not a function | 2025-06-23 17:20:00 | Frontend/API | Renomeado clearToken() para removeToken() para compatibilidade | Manter consistência de nomes entre classes que se comunicam |
| requireAdmin().then is not a function | 2025-06-23 18:00:00 | Frontend/Auth | Convertidas funções para async para compatibilidade com HTML existente | HTML existente pode esperar funções async - verificar uso antes |
| users.filter is not a function | 2025-06-23 18:15:00 | Frontend/API | API retornando objeto, não array. Adicionada verificação response.data | Backend pode retornar múltiplos formatos - sempre verificar estrutura |
| "Perfil de undefined" na aba User | 2025-06-23 17:00:00 | Frontend | Corrigidos campos: username → nome_usuario, phone → celular | Sempre usar nomes exatos do banco - consultar Document 2 |
| 403 Forbidden - Visitante bloqueado | 2025-06-23 20:45:00 | Backend/Auth | Guard usando includes() em string. Corrigido para === e removidos @Roles de GET | includes() não funciona em strings - usar comparação direta |
| Cannot set properties of null | 2025-06-23 20:50:00 | Frontend/Profile | profile.js acessando elementos DOM inexistentes. Adicionadas verificações | Sempre verificar se elemento DOM existe antes de manipular |
| getUserAvatar is not a function | 2025-06-23 20:52:00 | Frontend/Auth | Métodos getUserAvatar() e getPermissionIcon() ausentes. Implementados | Verificar dependências antes de usar métodos |
| Validação senha 6 caracteres desnecessária | 2025-06-24 12:15:00 | Frontend/Login | Removida validação de 6 caracteres mínimos em login e registro | Validações de segurança no backend, frontend mais flexível |
| ThrottlerModule dependency não instalada | 2025-06-24 12:20:00 | Backend/Auth | Removidos imports ThrottlerModule até dependência ser instalada | Verificar se dependências npm estão instaladas antes de importar |
| ui-avatars dependência externa | 2025-06-24 12:25:00 | Frontend/Auth | getUserAvatar() alterado para usar avatar local | Zero dependências externas - sempre usar recursos locais |
| CSS inline violando arquitetura | 2025-06-24 12:30:00 | Frontend/Login | Removido CSS inline, adicionado aviso para implementar em arquivo CSS | CSS separado do JavaScript conforme arquitetura |
| **🚨 ERRO CRÍTICO: Novas entities malformadas** | **2025-06-24 12:45:00** | **Backend/TypeORM** | **Entities Chave e LogSistema adicionadas com FKs incorretas causaram erro TypeORM** | **Verificar correspondência exata com schema SQL antes de adicionar entities** |
| **🚨 PERSISTENTE: TypeORM connection failed** | **2025-06-24 12:55:00** | **Backend/Database** | **AINDA NÃO RESOLVIDO - LogSistema FK corrigida mas erro persiste** | **Investigação sistemática necessária** |
| **✅ RESOLVIDO: docker-compose up --build** | **2025-06-24 13:00:00** | **Backend/Docker** | **❌ FALSO POSITIVO - Rebuild mascarou problema, erro voltou** | **Rebuild pode mascarar problemas temporariamente via cache** |
| **🔥 IDENTIFICADO: Eu caguei editando backend** | **2025-06-24 13:10:00** | **Backend/Auth** | **AuthService: adicionei validateToken() desnecessário. AuthController: adicionei rotas que não existiam. Voltando versões simplificadas originais** | **Não adicionar funcionalidades desnecessárias - manter código original funcionando** |

---

## LIÇÕES CRÍTICAS APRENDIDAS

### **🔥 ERROS MAIS GRAVES - NUNCA REPETIR:**

**1. ADICIONAR ENTITIES SEM VERIFICAR SCHEMA**
- ❌ **Erro**: Criar entities novas sem consultar Document 2
- ✅ **Correção**: Sempre verificar schema SQL exato antes de criar entities
- 🎯 **Regra**: Entities devem corresponder 100% ao SQL existente

**2. MODIFICAR ARQUIVO ERRADO**
- ❌ **Erro**: Criar artefatos mas não aplicar no arquivo real
- ✅ **Correção**: Sempre verificar se mudança foi aplicada no arquivo correto
- 🎯 **Regra**: Confirmar implementação real, não apenas artefatos

**3. VALIDAÇÃO DESNECESSÁRIA NO FRONTEND**
- ❌ **Erro**: Validações rigorosas no frontend bloqueando UX
- ✅ **Correção**: Frontend flexível, validações de segurança no backend
- 🎯 **Regra**: Frontend não deve impor restrições desnecessárias

### **⚠️ PADRÕES DE ERRO COMUNS:**

**Frontend:**
- Campos incorretos: usar nome_usuario, celular, permissao (nunca username, phone, permission)
- DOM manipulation: sempre verificar if(element) antes de usar
- Async functions: verificar se HTML espera .then() antes de implementar

**Backend:**
- FKs: usar { nullable: true, onDelete: 'SET NULL' } quando apropriado
- Guards: usar === para strings, não includes()
- Dependencies: verificar se está instalado antes de importar

---

## ANÁLISE DO ERRO PERSISTENTE

### **🚨 ERRO ATUAL:**
```
[Nest] 25336 - 24/06/2025, 08:36:37 ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
```

### **✅ JÁ VERIFICADO:**
- MySQL rodando ✅ (container up)
- .env existe ✅ (credenciais corretas)
- Entities corrigidas ✅ (User, Chave, LogSistema)

### **🔍 POSSÍVEIS CAUSAS RESTANTES:**

**1. SYNCHRONIZE ATIVADO**
- TypeORM pode estar tentando modificar schema existente
- **Teste**: Desabilitar `synchronize: false` no database.config.ts

**2. ENTITIES EXTRAS NO APP.MODULE**
- Pode ter entities registradas duplamente
- **Teste**: Verificar imports no app.module.ts

**3. CACHE TYPEORM**
- Metadata antiga pode estar causando conflito
- **Teste**: `docker-compose down && docker-compose up --build`

**4. CREDENCIAIS ESPECÍFICAS**
- Docker pode estar usando credenciais diferentes
- **Teste**: Conectar diretamente: `docker exec -it lab-mysql mysql -u lab_user -p`

### **🎯 PRÓXIMOS PASSOS SISTEMÁTICOS:**

1. **Testar conexão direta MySQL**
2. **Desabilitar synchronize temporariamente**
3. **Rebuild completo dos containers**
4. **Verificar logs MySQL detalhados**

---

## TEMPLATE PARA NOVOS ERROS
```
| [Descrição breve] | [YYYY-MM-DD HH:MM:SS] | [Area] | [Solução exata] | [Lição para prevenir] |
```

---

*Este log documenta erros para construir conhecimento institucional e prevenir recorrências. Sempre consultar antes de implementar mudanças similares.*