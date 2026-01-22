PS C:\Users\Grady> sprite login

✓ Logged in as grady.sain@gmail.com

✓ Created token for grady-sain
   API:           https://api.sprites.dev
   Token:         grady-sain/1441294/076446a8275fa6819c501fa28abcfd04/19f1c2fa7698e927cdf9aa4188cfd1d04a78ebcceb644b7ae383d1464e4d6f16

To create a sprite in this organization:
  sprite create -o grady-sain <sprite-name>

✓ Created saas-blueprint sprite in 0.1s

│ # Try creating a Sprite with the API:
│ $ curl -X POST https://api.sprites.dev/v1/sprites \
│   -H "Authorization: Bearer $TOKEN" \
│   -d '{"name":"saas-blueprint"}'

● Connecting to console...
sprite@sprite:~$