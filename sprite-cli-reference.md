# Sprite CLI Reference (Tested Commands)

## Connect to Sprite (Interactive Shell)
```
sprite console -s saas-blueprint
```
Opens interactive shell. **Note:** On Windows, press Enter after connecting to "wake up" the terminal.

## Run a Command on Sprite
```
sprite exec -s saas-blueprint <command>
```
For multi-part commands, wrap in bash:
```
sprite exec -s saas-blueprint bash -c "cd ~/saas-blueprint && git pull"
```

## Port Forwarding (Tunnel)
```
sprite proxy 3001 -s saas-blueprint
```
Forwards localhost:3001 to port 3001 on the sprite.

Can also map different ports:
```
sprite proxy 4005:3001 -s saas-blueprint
```
This maps local 4005 to sprite's 3001.

## Check Sprite URL
```
sprite url -s saas-blueprint
```

## Make Sprite URL Public
```
sprite url update --auth public -s saas-blueprint
```

## Make Sprite URL Private (Default)
```
sprite url update --auth default -s saas-blueprint
```

## List All Sprites
```
sprite list
```

## Create a Sprite
```
sprite create <name> -o grady-sain
```

## Destroy a Sprite
```
sprite destroy -s saas-blueprint
```

---

## Deploy Workflow (After You Push)

Run this single command to pull, build, and restart:
```
sprite exec -s saas-blueprint bash -c "source ~/.bashrc && cd ~/saas-blueprint && git pull && npm install && npm run build && pm2 restart saas-blueprint"
```

## PM2 Commands (Inside Sprite)

Check status:
```
pm2 status
```

View logs:
```
pm2 logs
```

Monitor:
```
pm2 monit
```

Restart app:
```
pm2 restart saas-blueprint
```

Stop app:
```
pm2 stop saas-blueprint
```

Start app (first time):
```
pm2 start npm --name saas-blueprint -- run server
```
