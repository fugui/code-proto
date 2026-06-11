.PHONY: all build clean frontend backend run

all: build

build: frontend backend

clean:
	rm -rf code-proto-server frontend/dist

frontend:
	cd frontend && ( [ -d node_modules ] || npm install )
	cd frontend && npm run build

backend:
	go mod download
	go build -o code-proto-server

run: build
	./code-proto-server
