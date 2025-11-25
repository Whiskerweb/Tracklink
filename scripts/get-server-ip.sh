#!/bin/bash
# Script pour obtenir l'IP publique du serveur
echo "🌐 Getting server public IP..."
IP=$(curl -s https://api.ipify.org || curl -s https://checkip.amazonaws.com || curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip)

if [ -z "$IP" ]; then
  echo "❌ Could not get IP. Please try manually:"
  echo "   - Visit: https://whatismyipaddress.com/"
  echo "   - Or check your server provider dashboard"
  exit 1
fi

echo "✅ Your server IP: $IP"
echo ""
echo "📋 Use this IP in OVH DNS configuration:"
echo "   Type: A"
echo "   Sous-domaine: @ (or leave empty)"
echo "   TTL: 3600"
echo "   Cible: $IP"
