#!/bin/bash

# ===============================================
# DIAGNÓSTICO SIMPLIFICADO - PROBLEMA SINGLE_USE
# Usando credenciais: devargon/123
# ===============================================

echo "🔍 DIAGNÓSTICO DO PROBLEMA SINGLE_USE"
echo "====================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# ===============================================
# AUTENTICAÇÃO COM CREDENCIAIS CORRETAS
# ===============================================

log_info "Obtendo token com devargon/123..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome_usuario":"devargon","senha":"123"}')

# Verificar ambos os formatos de token
TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
    TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    log_error "Falha ao extrair token. Resposta completa:"
    echo "$TOKEN_RESPONSE"
    exit 1
fi

log_success "Token obtido com sucesso: ${TOKEN:0:20}..."

# ===============================================
# TESTE CONTROLADO: SINGLE_USE BEHAVIOR
# ===============================================

TIMESTAMP=$(date +%s)
SINGLE_KEY="DIAG-SINGLE-$TIMESTAMP"

echo ""
log_info "FASE 1: CRIANDO CHAVE SINGLE_USE PARA TESTE"
echo "==========================================="

# 1. Criar chave single_use
log_info "1.1 - Criando chave single_use: $SINGLE_KEY"
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/chaves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"chave\": \"$SINGLE_KEY\",
    \"tipo\": \"single_use\",
    \"permissao\": \"Operador\",
    \"descricao\": \"Teste diagnóstico\"
  }")

echo "Resposta da criação: $CREATE_RESPONSE"

# 2. Estado inicial no banco
log_info "1.2 - Estado inicial da chave:"
docker exec lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, usos_atual, usos_maximo, status, data_criacao 
FROM chaves_acesso 
WHERE chave = '$SINGLE_KEY';"

echo ""
log_info "FASE 2: TESTANDO COMPORTAMENTO DE VALIDAÇÃO"
echo "==========================================="

# 3. Primeira validação
log_info "2.1 - VALIDAÇÃO: Testando chave single_use..."
VALIDATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d "{\"chave\": \"$SINGLE_KEY\"}")

echo "Resposta da validação: $VALIDATE_RESPONSE"

# 4. Estado após validação (AQUI É O PROBLEMA!)
log_info "2.2 - Estado APÓS validação (verificar se usos_atual mudou):"
docker exec lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, usos_atual, usos_maximo, status 
FROM chaves_acesso 
WHERE chave = '$SINGLE_KEY';"

echo ""
log_info "FASE 3: TESTANDO REGISTRO APÓS VALIDAÇÃO"
echo "========================================"

# 5. Tentar registrar usuário
log_info "3.1 - REGISTRO: Tentando criar usuário com a chave..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"nome_usuario\": \"diag_user_$TIMESTAMP\",
    \"funcao\": \"Coordenador\",
    \"email\": \"diag$TIMESTAMP@test.com\",
    \"senha\": \"123456\",
    \"chave_acesso\": \"$SINGLE_KEY\"
  }")

echo "Resposta do registro: $REGISTER_RESPONSE"

# 6. Estado final
log_info "3.2 - Estado FINAL da chave:"
docker exec lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, usos_atual, usos_maximo, status 
FROM chaves_acesso 
WHERE chave = '$SINGLE_KEY';"

# 7. Verificar se usuário foi criado
log_info "3.3 - Verificar se usuário foi criado:"
docker exec lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao, funcao, data_criacao 
FROM usuarios 
WHERE nome_usuario = 'diag_user_$TIMESTAMP';"

echo ""
log_info "FASE 4: TESTE COMPARATIVO - REGISTRO SEM VALIDAÇÃO PRÉVIA"
echo "========================================================"

# 8. Criar segunda chave para teste comparativo
SINGLE_KEY2="DIAG-DIRECT-$TIMESTAMP"

log_info "4.1 - Criando segunda chave para teste direto:"
CREATE_RESPONSE2=$(curl -s -X POST http://localhost:3000/api/chaves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"chave\": \"$SINGLE_KEY2\",
    \"tipo\": \"single_use\",
    \"permissao\": \"Operador\",
    \"descricao\": \"Teste direto sem validação\"
  }")

echo "Segunda chave criada: $CREATE_RESPONSE2"

# 9. Registro direto sem validação prévia
log_info "4.2 - REGISTRO DIRETO (sem validação prévia):"
DIRECT_REGISTER=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"nome_usuario\": \"direct_user_$TIMESTAMP\",
    \"funcao\": \"Coordenador\",
    \"email\": \"direct$TIMESTAMP@test.com\",
    \"senha\": \"123456\",
    \"chave_acesso\": \"$SINGLE_KEY2\"
  }")

echo "Registro direto: $DIRECT_REGISTER"

# 10. Estado da segunda chave
log_info "4.3 - Estado da segunda chave após registro direto:"
docker exec lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, usos_atual, usos_maximo, status 
FROM chaves_acesso 
WHERE chave = '$SINGLE_KEY2';"

# 11. Verificar usuário criado diretamente
log_info "4.4 - Usuário criado diretamente:"
docker exec lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao, funcao, data_criacao 
FROM usuarios 
WHERE nome_usuario = 'direct_user_$TIMESTAMP';"

echo ""
log_info "FASE 5: LOGS DO BACKEND"
echo "======================"

log_info "5.1 - Logs recentes do backend (últimas 30 linhas):"
docker logs lab-backend --tail=30

echo ""
echo "🔍 DIAGNÓSTICO CONCLUÍDO"
echo "========================"
log_warning "ANÁLISE DOS RESULTADOS:"
echo "1. ✅ Se usos_atual = 0 após validação → Validação NÃO consome"
echo "2. ❌ Se usos_atual = 1 após validação → Validação CONSOME (PROBLEMA!)"
echo "3. 🔄 Comparar comportamento entre 'validação+registro' vs 'registro direto'"
echo "4. 📊 Se registro direto funciona mas validação+registro falha = problema na validação"
echo ""
log_info "📋 PRÓXIMOS PASSOS:"
echo "- Se problema confirmado: corrigir validateKey() no ChavesService"
echo "- Separar lógica de validação da lógica de consumo"
echo "- Re-executar teste de estresse"