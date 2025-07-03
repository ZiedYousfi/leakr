package main

import (
	"context"
	"log"
	"os"

	"db-service/ent"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"

	users "db-service/handlers/users"
	"db-service/middleware"
)

func main() {

	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")

	client, err := ent.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("failed opening connection to db: %v", err)
	}
	defer client.Close()

	// Run migrations (optional, good for dev)
	if err := client.Schema.Create(context.Background()); err != nil {
		log.Fatalf("failed creating schema resources: %v", err)
	}

	app := fiber.New()

	// Add CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "chrome-extension://iinddcpilfbkhdaijbdhncbhbeginpgn, https://auth.leakr.net", // Allow specific Chrome extension origin
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	app.Use(middleware.AuthMiddleware())

	users.SetupRoutes(app, client) // Register the routes

	log.Fatal(app.Listen(":8080"))
}
