# Nginx Reverse Proxy Notes

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /media/ {
        alias /var/www/backend_gestor_soporte_uti/media/;
        access_log off;
        expires 7d;
    }

    location / {
        return 404;
    }
}
```

- `client_max_body_size` should match your expected upload limits.
- Ensure write permissions for the process that saves files into `media/`.
- If serving frontend from the same host, route `/` to your frontend upstream.
