# Como Executar o Projeto e Utilizar os Endpoints

Este guia mostra como executar o projeto Lottery States Collector e como interagir com a API usando curl.

## Configuração Inicial

1. **Configurar o ambiente**:
   ```bash
   # Instalar dependências
   pip install -r requirements.txt
   
   # Garantir que o MySQL está rodando (via XAMPP ou diretamente)
   # Porta padrão: 3306
   ```

2. **Configurar o banco de dados** (escolha uma opção):
   ```bash
   # Opção 1: Deixar a aplicação criar o banco de dados automaticamente
   # Opção 2: Executar o script SQL manualmente
   mysql -u root -p < database/setup.sql
   ```

## Executar a Aplicação

Execute o servidor Flask:
```bash
python run.py
```

Isso iniciará o servidor na porta 5000. Você deverá ver uma saída semelhante a esta:
```
 * Serving Flask app (...)
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

## Usando curl para Interagir com a API

### 1. Verificar se a API está funcionando

```bash
curl http://localhost:5000/
```

Resposta esperada:
```json
{
  "application": "Lottery States Collector API",
  "endpoints": {
    "collect_states": "/api/states/collect",
    "get_all_states": "/api/states/",
    "get_state_by_code": "/api/states/<code>"
  },
  "status": "running"
}
```

### 2. Coletar Dados dos Estados

```bash
# Coletar e salvar tanto no banco quanto na memória (comportamento padrão)
curl -X POST http://localhost:5000/api/states/collect

# Coletar e salvar apenas no banco de dados
curl -X POST "http://localhost:5000/api/states/collect?save_to_memory=0"

# Coletar e salvar apenas na memória
curl -X POST "http://localhost:5000/api/states/collect?save_to_db=0"
```

Resposta esperada:
```json
{
  "collected_states": 51,
  "database": {
    "failed": 0,
    "inserted": 51,
    "success": true,
    "total_processed": 51,
    "updated": 0
  },
  "memory": {
    "inserted": 51,
    "success": true,
    "total": 51,
    "unchanged": 0,
    "updated": 0
  },
  "success": true
}
```

### 3. Obter Todos os Estados

```bash
# Obter de ambas as fontes (banco e memória)
curl http://localhost:5000/api/states/

# Obter apenas do banco de dados
curl "http://localhost:5000/api/states/?source=db"

# Obter apenas da memória
curl "http://localhost:5000/api/states/?source=memory"
```

### 4. Obter Estado por Código

```bash
# Obter um estado específico (por exemplo, California)
curl http://localhost:5000/api/states/ca

# Especificar a fonte
curl "http://localhost:5000/api/states/ca?source=db"
```

Resposta esperada:
```json
{
  "source": "both",
  "state": {
    "code": "ca",
    "created_at": "2023-07-15T12:34:56",
    "id": 5,
    "name": "California"
  },
  "success": true
}
```

## Exemplos Completos de Fluxo de Trabalho

### Exemplo 1: Coletar e verificar os dados

```bash
# 1. Coletar dados
curl -X POST http://localhost:5000/api/states/collect

# 2. Verificar quantos estados foram coletados
curl http://localhost:5000/api/states/ | grep -o '"count": [0-9]*'

# 3. Verificar um estado específico
curl http://localhost:5000/api/states/ny
```

### Exemplo 2: Coletar apenas na memória e verificar

```bash
# 1. Coletar dados apenas na memória
curl -X POST "http://localhost:5000/api/states/collect?save_to_db=0"

# 2. Verificar os dados na memória
curl "http://localhost:5000/api/states/?source=memory"

# 3. Confirmar que o banco está vazio
curl "http://localhost:5000/api/states/?source=db"
```

## Solução de Problemas

1. **A API não está acessível**:
   - Verifique se o servidor está rodando
   - Certifique-se de que a porta 5000 não está sendo bloqueada por um firewall

2. **Erros ao conectar ao banco de dados**:
   - Verifique se o MySQL está rodando
   - Confira as credenciais em `app/repositories/database.py`

3. **A coleta de estados falha**:
   - Verifique sua conexão com a internet
   - Confira se o site www.lotterycorner.com está acessível 