#!/usr/bin/env bash
# Affiche l'URL du webhook NovaSend à partir du tunnel ngrok en cours d'exécution.
# Prérequis : `npm run tunnel` doit tourner dans un autre terminal.
set -euo pipefail

url=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | node -e "
let d='';
process.stdin.on('data', c => d += c).on('end', () => {
  try {
    const t = JSON.parse(d).tunnels.find(x => x.public_url.startsWith('https'));
    process.stdout.write(t ? t.public_url : '');
  } catch { process.stdout.write(''); }
})" 2>/dev/null || true)

if [ -z "$url" ]; then
  echo "❌ ngrok ne semble pas démarré. Lance d'abord :  npm run tunnel"
  exit 1
fi

echo "✅ Tunnel actif : $url"
echo ""
echo "URL webhook à coller dans le dashboard NovaSend :"
echo "  ${url}/api/paiements/webhook/novasend"
