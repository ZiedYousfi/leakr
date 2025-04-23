package main

import (
    "context"
    "log"

    "db-service/ent"
    _ "github.com/lib/pq"

		"github.com/gofiber/fiber/v2"

		//dbservice "db-service/handlers"
		users "db-service/handlers/users"
)

func main() {
	client, err := ent.Open("your_driver", "your_dsn")
	if err != nil {
			log.Fatalf("failed opening connection to db: %v", err)
	}
	defer client.Close()

	// Run migrations (optional, good for dev)
	if err := client.Schema.Create(context.Background()); err != nil {
			log.Fatalf("failed creating schema resources: %v", err)
	}


	app := fiber.New()

	// ... add middleware (logging, cors, auth, etc.) ...

	users.SetupRoutes(app, client) // Register the routes

	log.Fatal(app.Listen(":3000"))
}
