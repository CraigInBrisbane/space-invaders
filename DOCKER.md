# Docker Setup Instructions

## Building the Docker Image

To build the Docker image locally:

```bash
docker build -t space-invaders:latest .
```

Or with a more specific tag:

```bash
docker build -t space-invaders:1.0 .
```

## Running the Container

To run the container:

```bash
docker run -p 3000:3000 space-invaders:latest
```

Then open your browser and visit: `http://localhost:3000`

## Running in the Background

To run the container in the background (detached mode):

```bash
docker run -d -p 3000:3000 --name space-invaders space-invaders:latest
```

## Stopping the Container

To stop a running container:

```bash
docker stop space-invaders
```

## Removing the Container

To remove a stopped container:

```bash
docker rm space-invaders
```

## Viewing Logs

To see the container logs:

```bash
docker logs space-invaders
```

## Pushing to Docker Hub

To upload your image to Docker Hub:

1. Create a Docker Hub account at https://hub.docker.com

2. Login to Docker Hub:
```bash
docker login
```

3. Tag your image with your Docker Hub username:
```bash
docker tag space-invaders:latest yourusername/space-invaders:latest
```

4. Push to Docker Hub:
```bash
docker push yourusername/space-invaders:latest
```

5. Others can then pull and run it:
```bash
docker run -p 3000:3000 yourusername/space-invaders:latest
```

## Using Docker Compose (Optional)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  space-invaders:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

## System Requirements

- Docker installed (version 20.10+)
- 50MB disk space for the image
- 512MB RAM available
