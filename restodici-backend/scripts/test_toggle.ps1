$ErrorActionPreference='Stop'

$regBody=@{ 
  email='gerantbot+1@example.com';
  password='password123';
  nom='Gerant Test';
  type='RESTAURANT';
  restaurantNom='RestoTest';
  adresse='1 Rue Test'
}
$regJson=$regBody|ConvertTo-Json -Compress
Write-Output 'Registering...'
$reg=Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/register' -Method Post -Body $regJson -ContentType 'application/json' -ErrorAction Stop
$token=$reg.accessToken
Write-Output "TOKEN:$token"
$restId=$reg.user.restaurant.id
Write-Output "REST:$restId"

$catBody=@{ nom='CatTest'; restaurantId=$restId }
$cat=Invoke-RestMethod -Uri 'http://localhost:3000/api/menu/categories' -Method Post -Headers @{Authorization="Bearer $token"} -Body ($catBody|ConvertTo-Json -Compress) -ContentType 'application/json' -ErrorAction Stop
Write-Output "CAT_ID:$($cat.id)"

$articleBody=@{ nom='ArticleTest'; prix=4.5; categorieId=$cat.id; stock=10; disponible=$true; restaurantId=$restId }
$article=Invoke-RestMethod -Uri 'http://localhost:3000/api/menu/articles' -Method Post -Headers @{Authorization="Bearer $token"} -Body ($articleBody|ConvertTo-Json -Compress) -ContentType 'application/json' -ErrorAction Stop
Write-Output "ARTICLE_ID:$($article.id)"

$toggle=Invoke-RestMethod -Uri "http://localhost:3000/api/menu/articles/$($article.id)/disponible" -Method Patch -Headers @{Authorization="Bearer $token"} -Body ((@{ disponible = $false })|ConvertTo-Json -Compress) -ContentType 'application/json' -ErrorAction Stop
Write-Output "TOGGLE:$($toggle | ConvertTo-Json -Compress)"

Write-Output "Querying audit_logs from Postgres container..."
docker exec restodici-db psql -U restodici_user -d restodici_db -c "SELECT id,userId,action,payload,createdAt FROM audit_logs ORDER BY createdAt DESC LIMIT 5;"
