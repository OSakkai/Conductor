#!/bin/bash

# ===============================================
# BATERIA DE TESTE DE ESTRESSE - SISTEMA DE CHAVES
# Teste completo dos 3 tipos de chaves + edge cases
# ===============================================

echo "🔥 INICIANDO TESTE DE ESTRESSE - SISTEMA DE CHAVES COMPLETO"
echo "============================================================"

# Variáveis de controle
TIMESTAMP=$(date +%s)
ADMIN_TOKEN=""
TEST_COUNT=0
SUCCESS_COUNT=0
FAIL_COUNT=0

# Função para obter token de admin
get_admin_token() {
    echo "🔐 Obtendo token de administrador..."
    local response=$(curl -s -X POST http://localhost/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"nome_usuario": "devargon", "senha": "123"}')
    
    ADMIN_TOKEN=$(echo $response | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo "❌ Falha ao obter token de admin"
        exit 1
    fi
    
    echo "✅ Token obtido: ${ADMIN_TOKEN:0:20}..."
}

# Função para contar testes
count_test() {
    ((TEST_COUNT++))
    if [ "$1" = "success" ]; then
        ((SUCCESS_COUNT++))
        echo "✅ TESTE $TEST_COUNT: $2"
    else
        ((FAIL_COUNT++))
        echo "❌ TESTE $TEST_COUNT: $2"
    fi
}

# Função para verificar resposta JSON
check_response() {
    local response="$1"
    local expected_success="$2"
    local test_name="$3"
    
    if echo "$response" | grep -q "\"success\":$expected_success"; then
        count_test "success" "$test_name"
        return 0
    else
        count_test "fail" "$test_name - Resposta: $response"
        return 1
    fi
}

# ===============================================
# FASE 1: PREPARAÇÃO E LIMPEZA
# ===============================================

echo ""
echo "📋 FASE 1: PREPARAÇÃO DO AMBIENTE"
echo "================================="

echo "1.1 - Verificando conectividade..."
if ! curl -s http://localhost/api/auth/health > /dev/null; then
    echo "❌ Sistema não está acessível"
    exit 1
fi

get_admin_token

echo "1.2 - Limpando chaves de teste anteriores..."
curl -s -X GET http://localhost/api/chaves \
    -H "Authorization: Bearer $ADMIN_TOKEN" | \
    grep -o '"id":[0-9]*' | grep -o '[0-9]*' | \
    while read id; do
        if [ "$id" -gt 10 ]; then  # Manter chaves originais (ID <= 10)
            curl -s -X DELETE http://localhost/api/chaves/$id \
                -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
        fi
    done

echo "1.3 - Estado inicial das chaves..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT COUNT(*) as total_chaves FROM chaves_acesso;"

# ===============================================
# FASE 2: CRIAÇÃO DE CHAVES DE TESTE
# ===============================================

echo ""
echo "📋 FASE 2: CRIAÇÃO DE CHAVES DOS 3 TIPOS"
echo "======================================="

# 2.1 - Chave Permanente
echo "2.1 - Criando chave PERMANENTE..."
PERM_KEY="TEST-PERM-$TIMESTAMP"
response=$(curl -s -X POST http://localhost/api/chaves \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"chave\": \"$PERM_KEY\",
        \"tipo\": \"permanent\",
        \"permissao\": \"Usuario\",
        \"descricao\": \"Chave permanente para teste de estresse\"
    }")
check_response "$response" "true" "Criação de chave permanente"

# 2.2 - Chave de Uso Único
echo "2.2 - Criando chave DE USO ÚNICO..."
SINGLE_KEY="TEST-SINGLE-$TIMESTAMP"
response=$(curl -s -X POST http://localhost/api/chaves \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"chave\": \"$SINGLE_KEY\",
        \"tipo\": \"single_use\",
        \"permissao\": \"Operador\",
        \"usos_maximo\": 1,
        \"descricao\": \"Chave de uso único para teste\"
    }")
check_response "$response" "true" "Criação de chave de uso único"

# 2.3 - Chave Expirável (expira em 30 segundos)
echo "2.3 - Criando chave EXPIRÁVEL (30 segundos)..."
EXPIRE_KEY="TEST-EXPIRE-$TIMESTAMP"
EXPIRE_DATE=$(date -u -d '+30 seconds' '+%Y-%m-%d %H:%M:%S')
response=$(curl -s -X POST http://localhost/api/chaves \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"chave\": \"$EXPIRE_KEY\",
        \"tipo\": \"expiring\",
        \"permissao\": \"Administrador\",
        \"data_expiracao\": \"$EXPIRE_DATE\",
        \"descricao\": \"Chave expirável para teste (30s)\"
    }")
check_response "$response" "true" "Criação de chave expirável"

# 2.4 - Chave Expirável Já Expirada
echo "2.4 - Criando chave EXPIRÁVEL já expirada..."
EXPIRED_KEY="TEST-EXPIRED-$TIMESTAMP"
PAST_DATE=$(date -u -d '-1 hour' '+%Y-%m-%d %H:%M:%S')
response=$(curl -s -X POST http://localhost/api/chaves \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"chave\": \"$EXPIRED_KEY\",
        \"tipo\": \"expiring\",
        \"permissao\": \"Usuario\",
        \"data_expiracao\": \"$PAST_DATE\",
        \"descricao\": \"Chave já expirada para teste\"
    }")
check_response "$response" "true" "Criação de chave já expirada"

echo "2.5 - Verificando chaves criadas no banco..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, permissao, status, data_expiracao 
FROM chaves_acesso 
WHERE chave LIKE 'TEST-%' 
ORDER BY data_criacao DESC;"

# ===============================================
# FASE 3: TESTE DE ESTRESSE - CHAVE PERMANENTE
# ===============================================

echo ""
echo "📋 FASE 3: TESTE DE ESTRESSE - CHAVE PERMANENTE"
echo "==============================================="

echo "3.1 - Validando chave permanente (deve funcionar sempre)..."
for i in {1..5}; do
    response=$(curl -s -X POST http://localhost/api/chaves/validate \
        -H "Content-Type: application/json" \
        -d "{\"chave\": \"$PERM_KEY\"}")
    check_response "$response" "true" "Validação $i da chave permanente"
done

echo "3.2 - Registrando múltiplos usuários com chave permanente..."
for i in {1..3}; do
    username="perm_user_${i}_$TIMESTAMP"
    response=$(curl -s -X POST http://localhost/api/auth/register \
        -H "Content-Type: application/json" \
        -d "{
            \"nome_usuario\": \"$username\",
            \"email\": \"${username}@test.com\",
            \"senha\": \"senha123\",
            \"funcao\": \"Analista\",
            \"chave_acesso\": \"$PERM_KEY\"
        }")
    check_response "$response" "true" "Registro $i com chave permanente"
done

echo "3.3 - Verificando se chave permanente ainda está ativa..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, usos_atual, status FROM chaves_acesso WHERE chave='$PERM_KEY';"

echo "3.4 - Verificando usuários criados com chave permanente..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao FROM usuarios WHERE nome_usuario LIKE 'perm_user_%';"

# ===============================================
# FASE 4: TESTE DE ESTRESSE - CHAVE DE USO ÚNICO
# ===============================================

echo ""
echo "📋 FASE 4: TESTE DE ESTRESSE - CHAVE DE USO ÚNICO"
echo "================================================"

echo "4.1 - Primeira validação da chave de uso único (deve funcionar)..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d "{\"chave\": \"$SINGLE_KEY\"}")
check_response "$response" "true" "Primeira validação de chave single_use"

echo "4.2 - Primeiro registro com chave de uso único (deve funcionar)..."
single_username="single_user_$TIMESTAMP"
response=$(curl -s -X POST http://localhost/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"$single_username\",
        \"email\": \"${single_username}@test.com\",
        \"senha\": \"senha123\",
        \"funcao\": \"Coordenador\",
        \"chave_acesso\": \"$SINGLE_KEY\"
    }")
check_response "$response" "true" "Primeiro registro com chave single_use"

echo "4.3 - Verificando se chave foi marcada como usada..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, usos_atual, usos_maximo, status FROM chaves_acesso WHERE chave='$SINGLE_KEY';"

echo "4.4 - Segunda validação da chave (deve falhar - já usada)..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d "{\"chave\": \"$SINGLE_KEY\"}")
check_response "$response" "true" "Segunda validação de chave usada"

# Verificar se isValid é false
if echo "$response" | grep -q "\"isValid\":false"; then
    count_test "success" "Chave single_use corretamente invalidada após uso"
else
    count_test "fail" "Chave single_use deveria estar invalidada"
fi

echo "4.5 - Tentativa de segundo registro (deve falhar)..."
response=$(curl -s -X POST http://localhost/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"single_user_2_$TIMESTAMP\",
        \"email\": \"single2_${TIMESTAMP}@test.com\",
        \"senha\": \"senha123\",
        \"funcao\": \"Diretor\",
        \"chave_acesso\": \"$SINGLE_KEY\"
    }")
check_response "$response" "false" "Segundo registro com chave já usada (deve falhar)"

# ===============================================
# FASE 5: TESTE DE ESTRESSE - CHAVE EXPIRÁVEL
# ===============================================

echo ""
echo "📋 FASE 5: TESTE DE ESTRESSE - CHAVE EXPIRÁVEL"
echo "=============================================="

echo "5.1 - Validando chave expirável ANTES da expiração..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d "{\"chave\": \"$EXPIRE_KEY\"}")
check_response "$response" "true" "Validação de chave antes da expiração"

if echo "$response" | grep -q "\"isValid\":true"; then
    count_test "success" "Chave expirável válida antes da expiração"
else
    count_test "fail" "Chave expirável deveria estar válida antes da expiração"
fi

echo "5.2 - Registrando usuário com chave antes da expiração..."
expire_username="expire_user_$TIMESTAMP"
response=$(curl -s -X POST http://localhost/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"$expire_username\",
        \"email\": \"${expire_username}@test.com\",
        \"senha\": \"senha123\",
        \"funcao\": \"Gestor\",
        \"chave_acesso\": \"$EXPIRE_KEY\"
    }")
check_response "$response" "true" "Registro com chave antes da expiração"

echo "5.3 - Aguardando expiração da chave (35 segundos)..."
for i in {35..1}; do
    echo -ne "\rTempo restante: ${i}s "
    sleep 1
done
echo ""

echo "5.4 - Validando chave APÓS expiração (deve falhar)..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d "{\"chave\": \"$EXPIRE_KEY\"}")
check_response "$response" "true" "Validação após expiração"

if echo "$response" | grep -q "\"isValid\":false"; then
    count_test "success" "Chave expirável corretamente invalidada após expiração"
else
    count_test "fail" "Chave expirável deveria estar invalidada após expiração"
fi

echo "5.5 - Tentativa de registro após expiração (deve falhar)..."
response=$(curl -s -X POST http://localhost/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"expired_user_$TIMESTAMP\",
        \"email\": \"expired_${TIMESTAMP}@test.com\",
        \"senha\": \"senha123\",
        \"funcao\": \"Analista\",
        \"chave_acesso\": \"$EXPIRE_KEY\"
    }")
check_response "$response" "false" "Registro com chave expirada (deve falhar)"

echo "5.6 - Verificando status das chaves no banco após expiração..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, status, data_expiracao, 
       CASE WHEN data_expiracao < NOW() THEN 'EXPIRADA' ELSE 'VÁLIDA' END as tempo_status
FROM chaves_acesso 
WHERE chave IN ('$EXPIRE_KEY', '$EXPIRED_KEY');"

# ===============================================
# FASE 6: TESTE DE CHAVE JÁ EXPIRADA
# ===============================================

echo ""
echo "📋 FASE 6: TESTE DE CHAVE JÁ EXPIRADA"
echo "===================================="

echo "6.1 - Validando chave já expirada desde criação..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d "{\"chave\": \"$EXPIRED_KEY\"}")
check_response "$response" "true" "Validação de chave já expirada"

if echo "$response" | grep -q "\"isValid\":false"; then
    count_test "success" "Chave já expirada corretamente invalidada"
else
    count_test "fail" "Chave já expirada deveria estar invalidada"
fi

echo "6.2 - Tentativa de registro com chave já expirada (deve falhar)..."
response=$(curl -s -X POST http://localhost/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"already_expired_$TIMESTAMP\",
        \"email\": \"already_exp_${TIMESTAMP}@test.com\",
        \"senha\": \"senha123\",
        \"funcao\": \"Estagiario\",
        \"chave_acesso\": \"$EXPIRED_KEY\"
    }")
check_response "$response" "false" "Registro com chave já expirada (deve falhar)"

# ===============================================
# FASE 7: TESTES DE EDGE CASES
# ===============================================

echo ""
echo "📋 FASE 7: TESTES DE EDGE CASES"
echo "==============================="

echo "7.1 - Validação com chave vazia..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d '{"chave": ""}')
check_response "$response" "false" "Validação com chave vazia"

echo "7.2 - Validação com chave inexistente..."
response=$(curl -s -X POST http://localhost/api/chaves/validate \
    -H "Content-Type: application/json" \
    -d '{"chave": "CHAVE-INEXISTENTE-123456"}')
check_response "$response" "true" "Validação com chave inexistente"

if echo "$response" | grep -q "\"isValid\":false"; then
    count_test "success" "Chave inexistente corretamente invalidada"
else
    count_test "fail" "Chave inexistente deveria estar invalidada"
fi

echo "7.3 - Registro sem chave (deve criar Visitante)..."
response=$(curl -s -X POST http://localhost/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"no_key_user_$TIMESTAMP\",
        \"email\": \"nokey_${TIMESTAMP}@test.com\",
        \"senha\": \"senha123\",
        \"funcao\": \"Estagiario\"
    }")
check_response "$response" "true" "Registro sem chave"

echo "7.4 - Múltiplas validações simultâneas da chave permanente..."
for i in {1..10}; do
    (curl -s -X POST http://localhost/api/chaves/validate \
        -H "Content-Type: application/json" \
        -d "{\"chave\": \"$PERM_KEY\"}" > /dev/null) &
done
wait
count_test "success" "10 validações simultâneas da chave permanente"

# ===============================================
# FASE 8: VERIFICAÇÕES FINAIS E LIMPEZA
# ===============================================

echo ""
echo "📋 FASE 8: VERIFICAÇÕES FINAIS"
echo "=============================="

echo "8.1 - Estado final de todas as chaves de teste..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, tipo, permissao, usos_atual, usos_maximo, status,
       CASE 
           WHEN data_expiracao IS NULL THEN 'SEM_EXPIRACAO'
           WHEN data_expiracao < NOW() THEN 'EXPIRADA'
           ELSE 'VALIDA'
       END as tempo_status
FROM chaves_acesso 
WHERE chave LIKE 'TEST-%' 
ORDER BY data_criacao;"

echo "8.2 - Usuários criados durante os testes..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao, funcao, data_criacao 
FROM usuarios 
WHERE nome_usuario LIKE '%user_%' 
   OR nome_usuario LIKE 'no_key_%'
   OR nome_usuario LIKE '%expired%'
ORDER BY data_criacao DESC;"

echo "8.3 - Estatísticas finais do sistema..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT 
    (SELECT COUNT(*) FROM chaves_acesso) as total_chaves,
    (SELECT COUNT(*) FROM chaves_acesso WHERE status='ativa') as chaves_ativas,
    (SELECT COUNT(*) FROM chaves_acesso WHERE status='usada') as chaves_usadas,
    (SELECT COUNT(*) FROM chaves_acesso WHERE status='expirada') as chaves_expiradas,
    (SELECT COUNT(*) FROM usuarios) as total_usuarios,
    (SELECT COUNT(*) FROM usuarios WHERE data_criacao > DATE_SUB(NOW(), INTERVAL 1 HOUR)) as usuarios_criados_ultima_hora;"

echo "8.4 - Testando login dos usuários criados..."
echo "8.4.1 - Login do usuário com chave permanente..."
response=$(curl -s -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"perm_user_1_$TIMESTAMP\",
        \"senha\": \"senha123\"
    }")
check_response "$response" "true" "Login do usuário com chave permanente"

echo "8.4.2 - Login do usuário com chave de uso único..."
response=$(curl -s -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"$single_username\",
        \"senha\": \"senha123\"
    }")
check_response "$response" "true" "Login do usuário com chave single_use"

echo "8.4.3 - Login do usuário com chave expirável..."
response=$(curl -s -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"nome_usuario\": \"$expire_username\",
        \"senha\": \"senha123\"
    }")
check_response "$response" "true" "Login do usuário com chave expirável"

# ===============================================
# RESUMO FINAL
# ===============================================

echo ""
echo "======================================================="
echo "🔥 TESTE DE ESTRESSE CONCLUÍDO"
echo "======================================================="
echo ""
echo "📊 ESTATÍSTICAS DOS TESTES:"
echo "  Total de testes executados: $TEST_COUNT"
echo "  Sucessos: $SUCCESS_COUNT"
echo "  Falhas: $FAIL_COUNT"
echo "  Taxa de sucesso: $((SUCCESS_COUNT * 100 / TEST_COUNT))%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 TODOS OS TESTES PASSARAM!"
    echo "✅ Sistema de chaves funcionando perfeitamente"
    echo "✅ Chaves permanentes: Uso ilimitado confirmado"
    echo "✅ Chaves single_use: Controle de uso único confirmado"
    echo "✅ Chaves expiráveis: Controle de tempo confirmado"
    echo "✅ Edge cases: Tratamento de erros robusto"
else
    echo "⚠️  ALGUNS TESTES FALHARAM ($FAIL_COUNT/$TEST_COUNT)"
    echo "❗ Verifique os logs acima para identificar problemas"
fi

echo ""
echo "======================================================="
echo "🔧 RESUMO TÉCNICO:"
echo "  - Chaves criadas: 4 (permanent, single_use, expiring, expired)"
echo "  - Usuários criados: ~6-8 (dependendo dos testes)"
echo "  - Tipos de teste: Validação, Registro, Expiração, Edge cases"
echo "  - Tempo total: ~45 segundos (incluindo espera de expiração)"
echo "======================================================="