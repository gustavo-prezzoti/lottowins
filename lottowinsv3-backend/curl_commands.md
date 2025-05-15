# Comandos CURL para Teste dos Endpoints de Predição

## 1. Gerar uma nova predição
```bash
curl -X POST "http://localhost:8000/api/lottery/predictions/analyze/" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{
           "game_id": 1,
           "state_id": 1
         }'
```

## 2. Buscar predições do usuário autenticado (com filtros opcionais)
```bash
curl -X GET "http://localhost:8000/api/lottery/predictions/by-user/?game_id=1&state_id=1" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 3. Buscar todas as predições do usuário autenticado
```bash
curl -X GET "http://localhost:8000/api/lottery/predictions/by-user/" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 4. Excluir uma predição
```bash
curl -X DELETE "http://localhost:8000/api/lottery/predictions/delete/" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{
           "prediction_id": 1
         }'
```

## 5. Obter token de autenticação (login)
```bash
curl -X POST "http://localhost:8000/api/login/" \
     -H "Content-Type: application/json" \
     -d '{
           "email": "seu_email@exemplo.com",
           "password": "sua_senha"
         }'
```

## 6. Listar todas as predições do usuário autenticado (usando o viewset padrão)
```bash
curl -X GET "http://localhost:8000/api/lottery/predictions/" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Comandos PowerShell (Windows)

### PowerShell - Gerar nova predição
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/lottery/predictions/analyze/" `
                 -Method POST `
                 -Headers @{"Authorization"="Bearer YOUR_TOKEN_HERE"} `
                 -ContentType "application/json" `
                 -Body '{"game_id": 1, "state_id": 1}'
```

### PowerShell - Buscar predições do usuário autenticado
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/lottery/predictions/by-user/" `
                 -Method GET `
                 -Headers @{"Authorization"="Bearer YOUR_TOKEN_HERE"}
```

### PowerShell - Excluir predição
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/lottery/predictions/delete/" `
                 -Method DELETE `
                 -Headers @{"Authorization"="Bearer YOUR_TOKEN_HERE"} `
                 -ContentType "application/json" `
                 -Body '{"prediction_id": 1}'
``` 