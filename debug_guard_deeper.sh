#!/bin/bash
# ===============================================
# CONDUCTOR - INVESTIGAÇÃO GUARDS GLOBAIS
# debug_guard_deeper.sh
# PROTOCOLO P2: EVIDENCE-BASED DEBUGGING LAYER 2
# ===============================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔥 CONDUCTOR - INVESTIGAÇÃO GUARDS GLOBAIS${NC}"
echo -e "${PURPLE}===============================================${NC}"
echo ""

# ===============================================
# FASE 1: VERIFICAR SE ARQUIVO FOI ATUALIZADO
# ===============================================
echo -e "${BLUE}📋 FASE 1: VERIFICAR SE ARQUIVO FOI ATUALIZADO${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${CYAN}1.1 - Verificando timestamp do arquivo chaves.controller.ts...${NC}"
if [ -f "backend/src/chaves/chaves.controller.ts" ]; then
    ls -la backend/src/chaves/chaves.controller.ts
    echo ""
    echo -e "${CYAN}1.2 - Verificando se @UseGuards ainda está no controller...${NC}"
    grep -n "@UseGuards" backend/src/chaves/chaves.controller.ts || echo -e "${GREEN}✅ @UseGuards não encontrado no nível do controller${NC}"
    echo ""
    echo -e "${CYAN}1.3 - Verificando se @UseGuards está nos métodos individuais...${NC}"
    grep -A 2 -B 2 "@UseGuards" backend/src/chaves/chaves.controller.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/chaves/chaves.controller.ts${NC}"
fi

echo ""

# ===============================================
# FASE 2: VERIFICAR GUARDS GLOBAIS NO APP
# ===============================================
echo -e "${BLUE}📋 FASE 2: VERIFICAR GUARDS GLOBAIS NO APP${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${CYAN}2.1 - Verificando app.module.ts para guards globais...${NC}"
echo -e "${YELLOW}=== Procurando APP_GUARD, providers globais ===${NC}"
if [ -f "backend/src/app.module.ts" ]; then
    grep -n -A 5 -B 5 "APP_GUARD\|providers\|JwtAuthGuard" backend/src/app.module.ts || echo -e "${GREEN}✅ Não encontrado guards globais no AppModule${NC}"
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/app.module.ts${NC}"
fi

echo ""

echo -e "${CYAN}2.2 - Verificando main.ts para guards globais...${NC}"
echo -e "${YELLOW}=== Procurando useGlobalGuards ===${NC}"
if [ -f "backend/src/main.ts" ]; then
    cat backend/src/main.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/main.ts${NC}"
fi

echo ""

# ===============================================
# FASE 3: VERIFICAR SE BACKEND REALMENTE REINICIOU
# ===============================================
echo -e "${BLUE}📋 FASE 3: VERIFICAR SE BACKEND REINICIOU${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}3.1 - Verificando logs de inicialização do backend...${NC}"
docker-compose logs --tail=30 backend | grep -E "Nest|ChavesModule|inicializado|carregado"

echo ""

echo -e "${CYAN}3.2 - Forçando rebuild completo e restart...${NC}"
echo -e "${YELLOW}Parando containers...${NC}"
docker-compose down

echo -e "${YELLOW}Reconstruindo backend...${NC}"
docker-compose build backend

echo -e "${YELLOW}Iniciando containers...${NC}"
docker-compose up -d

echo -e "${YELLOW}Aguardando backend inicializar (15 segundos)...${NC}"
sleep 15

echo ""

# ===============================================
# FASE 4: VERIFICAR ROTAS REGISTRADAS
# ===============================================
echo -e "${BLUE}📋 FASE 4: VERIFICAR ROTAS REGISTRADAS${NC}"
echo -e "${BLUE}=====================================${NC}"

echo -e "${CYAN}4.1 - Verificando logs de registro de rotas...${NC}"
docker-compose logs backend | grep -E "route|Route|POST|chaves|validate" | tail -20

echo ""

echo -e "${CYAN}4.2 - Testando conectividade básica...${NC}"
curl -s http://localhost:3000/api/auth/test || echo -e "${RED}❌ Backend não está respondendo${NC}"

echo ""

# ===============================================
# FASE 5: TESTE DIRETO PÓS-REBUILD
# ===============================================
echo -e "${BLUE}📋 FASE 5: TESTE DIRETO PÓS-REBUILD${NC}"
echo -e "${BLUE}==================================${NC}"

echo -e "${CYAN}5.1 - Testando endpoint /validate após rebuild...${NC}"
curl -X POST http://localhost:3000/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{"chave":"TEST-PERM-1750856562"}' \
  -w "\nStatus HTTP: %{http_code}\n" \
  -v

echo ""

echo -e "${CYAN}5.2 - Testando endpoint GET /chaves (deve dar 401)...${NC}"
curl -X GET http://localhost:3000/api/chaves \
  -H "Content-Type: application/json" \
  -w "\nStatus HTTP: %{http_code}\n" \
  -v

echo ""

# ===============================================
# FASE 6: VERIFICAR MIDDLEWARES E INTERCEPTORS
# ===============================================
echo -e "${BLUE}📋 FASE 6: VERIFICAR MIDDLEWARES E INTERCEPTORS${NC}"
echo -e "${BLUE}================================================${NC}"

echo -e "${CYAN}6.1 - Procurando middlewares globais...${NC}"
find backend/src -name "*.ts" -exec grep -l "middleware\|Middleware" {} \; 2>/dev/null | head -10

echo ""

echo -e "${CYAN}6.2 - Procurando interceptors globais...${NC}"
find backend/src -name "*.ts" -exec grep -l "interceptor\|Interceptor" {} \; 2>/dev/null | head -10

echo ""

echo -e "${CYAN}6.3 - Verificando AuthModule para configurações globais...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/auth/auth.module.ts ===${NC}"
if [ -f "backend/src/auth/auth.module.ts" ]; then
    cat backend/src/auth/auth.module.ts
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/auth/auth.module.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: auth.module.ts ===${NC}"

echo ""

# ===============================================
# FASE 7: VERIFICAR DECORATORS E METADATA
# ===============================================
echo -e "${BLUE}📋 FASE 7: VERIFICAR DECORATORS E METADATA${NC}"
echo -e "${BLUE}==========================================${NC}"

echo -e "${CYAN}7.1 - Verificando se há decorators customizados...${NC}"
find backend/src -name "*.ts" -exec grep -l "SetMetadata\|createParamDecorator\|IS_PUBLIC" {} \; 2>/dev/null

echo ""

echo -e "${CYAN}7.2 - Procurando por skip auth ou public decorators...${NC}"
find backend/src -name "*.ts" -exec grep -l "Public\|SkipAuth\|IS_PUBLIC_KEY" {} \; 2>/dev/null

echo ""

# ===============================================
# FASE 8: ANÁLISE MANUAL DO CONTROLADOR
# ===============================================
echo -e "${BLUE}📋 FASE 8: ANÁLISE MANUAL DO CONTROLADOR${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${CYAN}8.1 - Mostrando EXATAMENTE como está o controlador atual...${NC}"
echo -e "${YELLOW}=== INÍCIO: backend/src/chaves/chaves.controller.ts ===${NC}"
if [ -f "backend/src/chaves/chaves.controller.ts" ]; then
    cat backend/src/chaves/chaves.controller.ts | head -50
else
    echo -e "${RED}❌ Arquivo não encontrado: backend/src/chaves/chaves.controller.ts${NC}"
fi
echo -e "${YELLOW}=== FIM: primeiras 50 linhas ===${NC}"

echo ""

echo -e "${CYAN}8.2 - Procurando especificamente pelo método validate...${NC}"
if [ -f "backend/src/chaves/chaves.controller.ts" ]; then
    grep -n -A 20 "validateKey\|validate" backend/src/chaves/chaves.controller.ts
else
    echo -e "${RED}❌ Arquivo não encontrado${NC}"
fi

echo ""

# ===============================================
# FASE 9: DIAGNÓSTICO FINAL
# ===============================================
echo -e "${BLUE}📋 FASE 9: DIAGNÓSTICO FINAL${NC}"
echo -e "${BLUE}=============================${NC}"

echo -e "${PURPLE}🔍 INVESTIGAÇÃO GUARDS GLOBAIS FINALIZADA${NC}"
echo -e "${PURPLE}==========================================${NC}"

echo -e "\n${CYAN}📊 PONTOS CRÍTICOS VERIFICADOS:${NC}"
echo -e "${YELLOW}1. Arquivo atualizado corretamente${NC}"
echo -e "${YELLOW}2. Guards globais no AppModule${NC}"
echo -e "${YELLOW}3. Guards globais no main.ts${NC}"
echo -e "${YELLOW}4. Middlewares e interceptors${NC}"
echo -e "${YELLOW}5. Rebuild completo do backend${NC}"

echo -e "\n${CYAN}🎯 PRÓXIMOS PASSOS:${NC}"
echo -e "${YELLOW}1. Analisar se problema é guards globais${NC}"
echo -e "${YELLOW}2. Verificar se arquivo foi realmente atualizado${NC}"
echo -e "${YELLOW}3. Implementar decorator @Public se necessário${NC}"

echo -e "\n${GREEN}✅ Script de investigação avançada concluído!${NC}"
echo ""