#!/bin/bash
# ===============================================
# CONDUCTOR - SCRIPT DE INVESTIGAÇÃO COMPLETA
# debug_chaves_system.sh
# PROTOCOLO P2: EVIDENCE-BASED DEBUGGING
# ===============================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔥 CONDUCTOR - INVESTIGAÇÃO COMPLETA DO SISTEMA DE CHAVES${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo ""

# ===============================================
# FASE 1: VERIFICAÇÃO DO AMBIENTE
# ===============================================
echo -e "${BLUE}📋 FASE 1: VERIFICAÇÃO DO AMBIENTE${NC}"
echo -e "${BLUE}===================================${NC}"

echo -e "${CYAN}1.1 - Verificando se containers estão rodando...${NC}"
docker-compose ps

echo -e "\n${CYAN}1.2 - Verificando logs recentes do backend...${NC}"
docker-compose logs --tail=20 backend

echo -e "\n${CYAN}1.3 - Testando conectividade básica com backend...${NC}"
curl -s http://localhost:3000/api/auth/test || echo -e "${RED}❌ Backend não está respondendo${NC}"

echo ""

# ===============================================
# FASE 2: ANÁLISE DE CÓDIGO - CONTROLLERS
# ===============================================
echo -e "${BLUE}📋 FASE 2: ANÁLISE DE CÓDIGO - CONTROLLERS${NC}"
echo -e "${BLUE}===========================================${NC}"

echo -e "${CYAN}2.1 - Examinando ChavesController completo...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/chaves/chaves.controller.ts ===${NC}"
if [ -f "backend/src/chaves/chaves.controller.ts" ]; then
    cat backend/src/chaves/chaves.controller.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/chaves/chaves.controller.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: chaves.controller.ts ===${NC}"

echo -e "\n${CYAN}2.2 - Examinando AuthController para comparação...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/auth/auth.controller.ts ===${NC}"
if [ -f "backend/src/auth/auth.controller.ts" ]; then
    cat backend/src/auth/auth.controller.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/auth/auth.controller.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: auth.controller.ts ===${NC}"

echo ""

# ===============================================
# FASE 3: ANÁLISE DE CÓDIGO - SERVICES
# ===============================================
echo -e "${BLUE}📋 FASE 3: ANÁLISE DE CÓDIGO - SERVICES${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}3.1 - Examinando ChavesService completo...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/chaves/chaves.service.ts ===${NC}"
if [ -f "backend/src/chaves/chaves.service.ts" ]; then
    cat backend/src/chaves/chaves.service.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/chaves/chaves.service.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: chaves.service.ts ===${NC}"

echo -e "\n${CYAN}3.2 - Examinando entidade Chave...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/chaves/chave.entity.ts ===${NC}"
if [ -f "backend/src/chaves/chave.entity.ts" ]; then
    cat backend/src/chaves/chave.entity.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/chaves/chave.entity.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: chave.entity.ts ===${NC}"

echo ""

# ===============================================
# FASE 4: ANÁLISE DE GUARDS E MIDDLEWARES
# ===============================================
echo -e "${BLUE}📋 FASE 4: ANÁLISE DE GUARDS E MIDDLEWARES${NC}"
echo -e "${BLUE}===========================================${NC}"

echo -e "${CYAN}4.1 - Examinando JwtAuthGuard...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/common/guards/jwt-auth.guard.ts ===${NC}"
if [ -f "backend/src/common/guards/jwt-auth.guard.ts" ]; then
    cat backend/src/common/guards/jwt-auth.guard.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/common/guards/jwt-auth.guard.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: jwt-auth.guard.ts ===${NC}"

echo -e "\n${CYAN}4.2 - Verificando decorators de roles...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/common/decorators/roles.decorator.ts ===${NC}"
if [ -f "backend/src/common/decorators/roles.decorator.ts" ]; then
    cat backend/src/common/decorators/roles.decorator.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/common/decorators/roles.decorator.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: roles.decorator.ts ===${NC}"

echo ""

# ===============================================
# FASE 5: ANÁLISE DE MÓDULOS E CONFIGURAÇÃO
# ===============================================
echo -e "${BLUE}📋 FASE 5: ANÁLISE DE MÓDULOS E CONFIGURAÇÃO${NC}"
echo -e "${BLUE}=============================================${NC}"

echo -e "${CYAN}5.1 - Examinando ChavesModule...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/chaves/chaves.module.ts ===${NC}"
if [ -f "backend/src/chaves/chaves.module.ts" ]; then
    cat backend/src/chaves/chaves.module.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/chaves/chaves.module.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: chaves.module.ts ===${NC}"

echo -e "\n${CYAN}5.2 - Examinando AppModule para verificar importações...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/app.module.ts ===${NC}"
if [ -f "backend/src/app.module.ts" ]; then
    cat backend/src/app.module.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/app.module.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: app.module.ts ===${NC}"

echo ""

# ===============================================
# FASE 6: TESTE DIRETO DOS ENDPOINTS
# ===============================================
echo -e "${BLUE}📋 FASE 6: TESTE DIRETO DOS ENDPOINTS${NC}"
echo -e "${BLUE}=====================================${NC}"

echo -e "${CYAN}6.1 - Testando endpoint /api/chaves/validate (deve ser público)...${NC}"
echo -e "${YELLOW}Request: POST /api/chaves/validate${NC}"
curl -X POST http://localhost:3000/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{"chave":"TEST-PERM-1750856562"}' \
  -w "\nStatus HTTP: %{http_code}\n" \
  -s || echo -e "${RED}❌ Erro na requisição${NC}"

echo -e "\n${CYAN}6.2 - Testando endpoint sem chave (deve retornar erro específico)...${NC}"
echo -e "${YELLOW}Request: POST /api/chaves/validate (sem chave)${NC}"
curl -X POST http://localhost:3000/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nStatus HTTP: %{http_code}\n" \
  -s || echo -e "${RED}❌ Erro na requisição${NC}"

echo -e "\n${CYAN}6.3 - Testando endpoint com chave inexistente...${NC}"
echo -e "${YELLOW}Request: POST /api/chaves/validate (chave inexistente)${NC}"
curl -X POST http://localhost:3000/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{"chave":"CHAVE-INEXISTENTE-123"}' \
  -w "\nStatus HTTP: %{http_code}\n" \
  -s || echo -e "${RED}❌ Erro na requisição${NC}"

echo -e "\n${CYAN}6.4 - Testando endpoint /api/chaves (deve ser protegido)...${NC}"
echo -e "${YELLOW}Request: GET /api/chaves (sem token)${NC}"
curl -X GET http://localhost:3000/api/chaves \
  -H "Content-Type: application/json" \
  -w "\nStatus HTTP: %{http_code}\n" \
  -s || echo -e "${RED}❌ Erro na requisição${NC}"

echo ""

# ===============================================
# FASE 7: VERIFICAÇÃO DO BANCO DE DADOS
# ===============================================
echo -e "${BLUE}📋 FASE 7: VERIFICAÇÃO DO BANCO DE DADOS${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}7.1 - Verificando chaves existentes no banco...${NC}"
docker-compose exec mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT 
    chave, 
    tipo, 
    permissao, 
    status, 
    usos_atual, 
    usos_maximo,
    data_expiracao,
    CASE 
        WHEN data_expiracao IS NULL THEN 'SEM_EXPIRACAO'
        WHEN data_expiracao > NOW() THEN 'VALIDA'
        ELSE 'EXPIRADA'
    END as tempo_status
FROM chaves_acesso 
WHERE chave LIKE 'TEST-%' 
ORDER BY data_criacao DESC;"

echo -e "\n${CYAN}7.2 - Verificando estrutura da tabela chaves_acesso...${NC}"
docker-compose exec mysql mysql -u lab_user -plab_password123 lab_sistema -e "
DESCRIBE chaves_acesso;"

echo -e "\n${CYAN}7.3 - Verificando últimos logs do sistema...${NC}"
docker-compose exec mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT 
    acao, 
    detalhes, 
    data_criacao 
FROM log_usuarios 
WHERE acao LIKE '%chave%' 
ORDER BY data_criacao DESC 
LIMIT 10;"

echo ""

# ===============================================
# FASE 8: ANÁLISE DE ROTAS E CONFIGURAÇÃO WEB
# ===============================================
echo -e "${BLUE}📋 FASE 8: ANÁLISE DE ROTAS E CONFIGURAÇÃO WEB${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${CYAN}8.1 - Verificando configuração do Nginx...${NC}"
echo -e "${YELLOW}=== INÍCIO: docker/nginx/nginx.conf ===${NC}"
if [ -f "docker/nginx/nginx.conf" ]; then
    cat docker/nginx/nginx.conf
else
    echo -e "${RED}❌ Arquivo não encontrado: docker/nginx/nginx.conf${NC}"
fi
echo -e "${YELLOW}=== FIM: nginx.conf ===${NC}"

echo -e "\n${CYAN}8.2 - Verificando docker-compose.yml...${NC}"
echo -e "${YELLOW}=== INÍCIO: docker-compose.yml ===${NC}"
if [ -f "docker-compose.yml" ]; then
    cat docker-compose.yml
else
    echo -e "${RED}❌ Arquivo não encontrado: docker-compose.yml${NC}"
fi
echo -e "${YELLOW}=== FIM: docker-compose.yml ===${NC}"

echo ""

# ===============================================
# FASE 9: VERIFICAÇÃO DE DEPENDÊNCIAS
# ===============================================
echo -e "${BLUE}📋 FASE 9: VERIFICAÇÃO DE DEPENDÊNCIAS${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}9.1 - Verificando package.json do backend...${NC}"
echo -e "${YELLOW}=== DEPENDÊNCIAS RELEVANTES ===${NC}"
if [ -f "backend/package.json" ]; then
    cat backend/package.json | jq '.dependencies | with_entries(select(.key | contains("nest") or contains("jwt") or contains("passport") or contains("typeorm") or contains("mysql")))'
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/package.json${NC}"
fi

echo -e "\n${CYAN}9.2 - Verificando se há DTOs para chaves...${NC}"
echo -e "${YELLOW}=== Procurando arquivos DTO ===${NC}"
find backend/src -name "*dto*" -type f | head -10

echo ""

# ===============================================
# FASE 10: TESTE DE INTEGRAÇÃO COMPLETO
# ===============================================
echo -e "${BLUE}📋 FASE 10: TESTE DE INTEGRAÇÃO COMPLETO${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}10.1 - Obtendo token de administrador para testes...${NC}"
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome_usuario":"docker_user teste","senha":"123456"}' | \
  jq -r '.data.access_token // empty')

if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Token obtido com sucesso${NC}"
    
    echo -e "\n${CYAN}10.2 - Testando GET /api/chaves com token válido...${NC}"
    curl -X GET http://localhost:3000/api/chaves \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -w "\nStatus HTTP: %{http_code}\n" \
      -s
    
    echo -e "\n${CYAN}10.3 - Testando criação de chave para comparar comportamento...${NC}"
    curl -X POST http://localhost:3000/api/chaves \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{
        "chave": "DEBUG-TEST-'$(date +%s)'",
        "tipo": "permanent",
        "permissao": "Usuario",
        "descricao": "Chave de teste para debug"
      }' \
      -w "\nStatus HTTP: %{http_code}\n" \
      -s
else
    echo -e "${RED}❌ Não foi possível obter token de administrador${NC}"
fi

echo ""

# ===============================================
# FASE 11: VERIFICAÇÃO DE LOGS E ERROS
# ===============================================
echo -e "${BLUE}📋 FASE 11: VERIFICAÇÃO DE LOGS E ERROS${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}11.1 - Logs do backend dos últimos 2 minutos...${NC}"
docker-compose logs --since 2m backend

echo -e "\n${CYAN}11.2 - Verificando se há erros específicos relacionados a chaves...${NC}"
docker-compose logs backend 2>&1 | grep -i "chave\|key\|validation" | tail -20

echo ""

# ===============================================
# FASE 12: RESUMO E DIAGNÓSTICO
# ===============================================
echo -e "${BLUE}📋 FASE 12: RESUMO E DIAGNÓSTICO${NC}"
echo -e "${BLUE}=================================${NC}"

echo -e "${PURPLE}🔍 INVESTIGAÇÃO COMPLETA FINALIZADA${NC}"
echo -e "${PURPLE}===================================${NC}"

echo -e "\n${CYAN}📊 PONTOS CRÍTICOS PARA ANÁLISE:${NC}"
echo -e "${YELLOW}1. Configuração de guards no ChavesController${NC}"
echo -e "${YELLOW}2. Método validateChave no ChavesService${NC}"
echo -e "${YELLOW}3. Status HTTP retornados pelos endpoints${NC}"
echo -e "${YELLOW}4. Configuração de rotas no módulo${NC}"
echo -e "${YELLOW}5. Comparação com endpoints que funcionam (auth)${NC}"

echo -e "\n${CYAN}🎯 PRÓXIMOS PASSOS:${NC}"
echo -e "${YELLOW}1. Analisar output deste script${NC}"
echo -e "${YELLOW}2. Identificar discrepâncias entre documentação e código${NC}"
echo -e "${YELLOW}3. Implementar correções baseadas em evidências${NC}"
echo -e "${YELLOW}4. Re-executar testes para validar correções${NC}"

echo -e "\n${GREEN}✅ Script de investigação concluído!${NC}"
echo -e "${CYAN}📝 Salve o output deste script para análise detalhada.${NC}"

echo ""