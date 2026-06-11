package main

import (
	"context"
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"code-proto/handlers"
	"code-proto/models"

	"github.com/gin-gonic/gin"
)

//go:embed all:frontend/dist
var frontendFS embed.FS

var (
	Version   = "v1.0.0"
	CommitID  = "unknown"
	BuildTime = "unknown"
)

func main() {
	configPath := flag.String("config", "config.yaml", "Path to config.yaml file")
	flag.Parse()

	log.Printf("Code-Proto Server %s (commit: %s, built: %s)\n", Version, CommitID, BuildTime)

	// 1. Load config
	if err := models.LoadConfig(*configPath); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Initialize Database
	models.InitDB()

	// 3. Initialize Gin engine
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	if models.AppConfig.Server.GinLog {
		r.Use(gin.Logger())
	}

	// 4. Public webhooks API (Unprotected)
	publicGroup := r.Group("/api")
	{
		publicGroup.POST("/webhook", handlers.HandleWebhook)
	}

	// 5. Protected User APIs
	protectedGroup := r.Group("/api")
	protectedGroup.Use(handlers.AuthMiddleware())
	{
		protectedGroup.GET("/me", handlers.GetMe)
		protectedGroup.GET("/mr", handlers.GetMrEvents)
		protectedGroup.GET("/mr/:id", handlers.GetMrEventDetail)
	}

	// 6. Serve frontend static assets (built in /proto prefix subpath)
	distFS, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		log.Println("Warning: frontend/dist folder not found, skipping frontend embedding.")
	} else {
		httpFS := http.FS(distFS)
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// Don't route API calls to index
			if len(path) >= 4 && path[:4] == "/api" {
				c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
				return
			}

			// Redirect root path to app route
			if path == "/" || path == "/proto" {
				c.Redirect(http.StatusFound, "/proto/")
				return
			}

			cleanPath := path
			if strings.HasPrefix(path, "/proto") {
				cleanPath = strings.TrimPrefix(path, "/proto")
			}

			if cleanPath != "" && cleanPath != "/" {
				f, err := distFS.Open(cleanPath[1:])
				if err == nil {
					f.Close()
					c.FileFromFS(cleanPath, httpFS)
					return
				}
			}

			indexBytes, err := fs.ReadFile(distFS, "index.html")
			if err != nil {
				c.String(http.StatusNotFound, "index.html not found")
				return
			}
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexBytes)
		})
	}

	// 7. Setup HTTP server
	port := models.AppConfig.Server.Port
	if port == "" {
		port = ":8081"
	}

	// Wrap standard handler to strip /proto/api prefix before Gin handles it
	var httpHandler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if strings.HasPrefix(req.URL.Path, "/proto/api") {
			req.URL.Path = strings.TrimPrefix(req.URL.Path, "/proto")
		}
		r.ServeHTTP(w, req)
	})

	srv := &http.Server{
		Addr:              port,
		Handler:           httpHandler,
		ReadTimeout:       models.AppConfig.Server.ReadTimeout,
		ReadHeaderTimeout: models.AppConfig.Server.ReadHeaderTimeout,
		WriteTimeout:      models.AppConfig.Server.WriteTimeout,
		IdleTimeout:       models.AppConfig.Server.IdleTimeout,
		MaxHeaderBytes:    models.AppConfig.Server.MaxHeaderBytes,
	}

	// 8. Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("Starting code-proto Server on %s ...\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down code-proto server ...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited gracefully")
}
