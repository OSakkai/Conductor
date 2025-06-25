#!/bin/bash

# ===============================================
# BATERIA COMPLETA DE TESTES - INTEGRAÇÃO DE CHAVES
# Execute cada seção em ordem e confirme resultados
# ===============================================

echo "🧪 INICIANDO BATERIA DE TESTES - INTEGRAÇÃO DE CHAVES"
echo "======================================================="

# ===============================================
# FASE 1: PREPARAÇÃO E REBUILD
# ===============================================

echo ""
echo "📋 FASE 1: PREPARAÇÃO DO SISTEMA"
echo "================================"

echo "1.1 - Parando sistema atual..."
docker-compose down

echo "1.2 - Rebuild completo do sistema..."
docker-compose up --build -d

echo "1.3 - Aguardando inicialização (30 segundos)..."
sleep 30

echo "1.4 - Verificando status dos containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "1.5 - Verificando logs do backend..."
docker logs lab-backend --tail 10

# ===============================================
# FASE 2: TESTES DE CONECTIVIDADE
# ===============================================

echo ""
echo "📋 FASE 2: TESTES DE CONECTIVIDADE"
echo "=================================="

echo "2.1 - Testando health check do backend..."
curl -s http://localhost/api/auth/health | jq . || echo "❌ Health check falhou"

echo ""
echo "2.2 - Testando acesso ao frontend..."
curl -s -I http://localhost/ | head -1

echo ""
echo "2.3 - Testando proxy nginx..."
curl -s -I http://localhost/api/ | head -1

# ===============================================
# FASE 3: VERIFICAÇÃO DO ESTADO ATUAL DAS CHAVES
# ===============================================

echo ""
echo "📋 FASE 3: ESTADO ATUAL DAS CHAVES"
echo "=================================="

echo "3.1 - Listando chaves ativas no banco..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT id, chave, tipo, permissao, usos_atual, usos_maximo, status 
FROM chaves_acesso 
WHERE status='ativa' 
ORDER BY data_criacao DESC;"

echo ""
echo "3.2 - Verificando a chave de teste específica..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT id, chave, tipo, permissao, usos_atual, usos_maximo, status, data_criacao
FROM chaves_acesso 
WHERE chave='COND-ONCE-USR-2025-DMKUQP';"

# ===============================================
# FASE 4: TESTE DO ENDPOINT DE VALIDAÇÃO
# ===============================================

echo ""
echo "📋 FASE 4: TESTE DO ENDPOINT DE VALIDAÇÃO"
echo "========================================="

echo "4.1 - Testando validação de chave VÁLIDA..."
curl -X POST http://localhost/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{"chave": "COND-ONCE-USR-2025-DMKUQP"}' \
  | jq .

echo ""
echo "4.2 - Testando validação de chave INVÁLIDA..."
curl -X POST http://localhost/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{"chave": "CHAVE-INEXISTENTE-123"}' \
  | jq .

echo ""
echo "4.3 - Testando validação sem chave..."
curl -X POST http://localhost/api/chaves/validate \
  -H "Content-Type: application/json" \
  -d '{"chave": ""}' \
  | jq .

# ===============================================
# FASE 5: TESTE DE REGISTRO SEM CHAVE
# ===============================================

echo ""
echo "📋 FASE 5: TESTE DE REGISTRO SEM CHAVE"
echo "====================================="

echo "5.1 - Registrando usuário SEM chave (deve ser Visitante)..."
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome_usuario": "teste_sem_chave_'$(date +%s)'",
    "email": "sem.chave.'$(date +%s)'@test.com",
    "senha": "senha123",
    "funcao": "Estagiario"
  }' | jq .

echo ""
echo "5.2 - Verificando permissão do usuário criado sem chave..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao, data_criacao 
FROM usuarios 
WHERE nome_usuario LIKE 'teste_sem_chave_%' 
ORDER BY data_criacao DESC LIMIT 1;"

# ===============================================
# FASE 6: TESTE DE REGISTRO COM CHAVE VÁLIDA
# ===============================================

echo ""
echo "📋 FASE 6: TESTE DE REGISTRO COM CHAVE VÁLIDA"
echo "============================================="

TIMESTAMP=$(date +%s)
USERNAME="teste_com_chave_$TIMESTAMP"

echo "6.1 - Verificando estado da chave ANTES do registro..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, usos_atual, usos_maximo, status 
FROM chaves_acesso 
WHERE chave='COND-ONCE-USR-2025-DMKUQP';"

echo ""
echo "6.2 - Registrando usuário COM chave válida..."
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome_usuario": "'$USERNAME'",
    "email": "'$USERNAME'@test.com",
    "senha": "senha123",
    "funcao": "Analista",
    "chave_acesso": "COND-ONCE-USR-2025-DMKUQP"
  }' | jq .

echo ""
echo "6.3 - Verificando se usuário foi criado com permissão CORRETA..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao, funcao, data_criacao 
FROM usuarios 
WHERE nome_usuario='$USERNAME';"

echo ""
echo "6.4 - Verificando se chave foi marcada como USADA..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT chave, usos_atual, usos_maximo, status 
FROM chaves_acesso 
WHERE chave='COND-ONCE-USR-2025-DMKUQP';"

# ===============================================
# FASE 7: TESTE DE REGISTRO COM CHAVE JÁ USADA
# ===============================================

echo ""
echo "📋 FASE 7: TESTE DE CHAVE JÁ USADA"
echo "================================="

echo "7.1 - Tentando registrar NOVAMENTE com a mesma chave (deve falhar)..."
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome_usuario": "teste_chave_usada_'$(date +%s)'",
    "email": "chave.usada.'$(date +%s)'@test.com",
    "senha": "senha123",
    "funcao": "Gestor",
    "chave_acesso": "COND-ONCE-USR-2025-DMKUQP"
  }' | jq .

# ===============================================
# FASE 8: TESTE DE LOGIN DOS USUÁRIOS CRIADOS
# ===============================================

echo ""
echo "📋 FASE 8: TESTE DE LOGIN DOS USUÁRIOS"
echo "====================================="

echo "8.1 - Testando login do usuário criado COM chave..."
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "nome_usuario": "'$USERNAME'",
    "senha": "senha123"
  }' | jq '.success, .message, .user.permissao'

echo ""
echo "8.2 - Verificando se login existente ainda funciona (devargon)..."
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "nome_usuario": "devargon",
    "senha": "123"
  }' | jq '.success, .message, .user.permissao'

# ===============================================
# FASE 9: TESTE DE COMPATIBILIDADE - FUNCIONALIDADES EXISTENTES
# ===============================================

echo ""
echo "📋 FASE 9: TESTE DE COMPATIBILIDADE"
echo "==================================="

echo "9.1 - Testando listagem de usuários (deve funcionar)..."
# Primeiro fazer login para obter token
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nome_usuario": "devargon", "senha": "123"}' | jq -r '.access_token')

echo "Token obtido: ${TOKEN:0:20}..."

echo ""
echo "9.2 - Testando acesso a endpoint protegido..."
curl -s -X GET http://localhost/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.success, (.data | length)'

echo ""
echo "9.3 - Testando listagem de chaves..."
curl -s -X GET http://localhost/api/chaves \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.success, (.data | length)'

# ===============================================
# FASE 10: VERIFICAÇÕES FINAIS
# ===============================================

echo ""
echo "📋 FASE 10: VERIFICAÇÕES FINAIS"
echo "==============================="

echo "10.1 - Estado final das chaves no sistema..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT COUNT(*) as total_chaves, 
       SUM(CASE WHEN status='ativa' THEN 1 ELSE 0 END) as ativas,
       SUM(CASE WHEN status='usada' THEN 1 ELSE 0 END) as usadas
FROM chaves_acesso;"

echo ""
echo "10.2 - Usuários criados durante os testes..."
docker exec -it lab-mysql mysql -u lab_user -plab_password123 lab_sistema -e "
SELECT nome_usuario, permissao, data_criacao 
FROM usuarios 
WHERE nome_usuario LIKE 'teste_%' 
ORDER BY data_criacao DESC;"

echo ""
echo "10.3 - Logs recentes do backend..."
docker logs lab-backend --tail 20

echo ""
echo "10.4 - Status final dos containers..."
docker ps --format "table {{.Names}}\t{{.Status}}"

# ===============================================
# RESUMO DOS TESTES
# ===============================================

echo ""
echo "======================================================="
echo "🎯 RESUMO DOS TESTES ESPERADOS"
echo "======================================================="
echo ""
echo "✅ SUCESSOS ESPERADOS:"
echo "  - Health check responde com sucesso"
echo "  - Endpoint /chaves/validate funciona"
echo "  - Chave válida retorna isValid: true"
echo "  - Chave inválida retorna isValid: false"
echo "  - Registro sem chave cria usuário Visitante"
echo "  - Registro com chave cria usuário com permissão da chave"
echo "  - Chave single_use é marcada como usada"
echo "  - Segunda tentativa com mesma chave falha"
echo "  - Login dos usuários criados funciona"
echo "  - Funcionalidades existentes mantidas"
echo ""
echo "❌ FALHAS ESPERADAS:"
echo "  - Registro com chave inválida deve falhar"
echo "  - Registro com chave já usada deve falhar"
echo "  - Acesso sem token a endpoints protegidos"
echo ""
echo "======================================================="
echo "🧪 BATERIA DE TESTES CONCLUÍDA"
echo "======================================================="