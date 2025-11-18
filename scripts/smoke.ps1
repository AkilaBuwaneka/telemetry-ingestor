param(
  [string]$BaseUrl = "http://localhost:3000/api/v1",
  [string]$Token = "secret123"
)

function call($method,$path,$body=$null){
  $h = @{ Authorization = "Bearer $Token" }
  if($body){ $json = $body | ConvertTo-Json -Depth 5 } else { $json = $null }
  Invoke-RestMethod -Method $method -Uri "$BaseUrl/$path" -Headers $h -ContentType 'application/json' -Body $json
}

Write-Host "Health:"
Invoke-RestMethod "$BaseUrl/health"

Write-Host "Ingest (temp alert)"
call Post "telemetry" @{
  deviceId='dev-002'; siteId='site-A'; ts=(Get-Date).ToUniversalTime().ToString('o');
  metrics=@{ temperature=55.3; humidity=40 }
}

Start-Sleep -Seconds 1
Write-Host "Latest:"
Invoke-RestMethod "$BaseUrl/devices/dev-002/latest"

Write-Host "Humidity alert"
call Post "telemetry" @{
  deviceId='dev-002'; siteId='site-A'; ts=(Get-Date).ToUniversalTime().ToString('o');
  metrics=@{ temperature=20; humidity=95 }
}

Write-Host "Summary"
$from=(Get-Date).AddHours(-1).ToUniversalTime().ToString('o')
$to=(Get-Date).AddHours(1).ToUniversalTime().ToString('o')
Invoke-RestMethod "$BaseUrl/sites/site-A/summary?from=$from&to=$to"
Write-Host "Done."