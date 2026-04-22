# test-webhook.ps1
# Script para simular o Webhook da Cakto ativando um plano Premium localmente
# Uso: No PowerShell, rode `.\test-webhook.ps1 -Email "seu-email@aqui.com"`

param (
    [string]$Email = "teste@exemplo.com"
)

$url = "http://localhost:3001/api/webhook/cakto"

$payload = @{
    event = "order.approved"
    data = @{
        status = "approved"
        customer = @{
            email = $Email
            name = "Usuário Teste"
        }
        product = @{
            name = "ProMat Premium - Anual"
        }
    }
}

$jsonPayload = $payload | ConvertTo-Json -Depth 5

Write-Host "Disparando Webhook simulado da Cakto para $url..." -ForegroundColor Cyan
Write-Host "Email alvo: $Email`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $jsonPayload -ContentType "application/json"
    Write-Host "✅ Sucesso! Resposta do servidor: $response" -ForegroundColor Green
} catch {
    Write-Host "❌ Falha ao chamar o webhook: $_" -ForegroundColor Red
}
