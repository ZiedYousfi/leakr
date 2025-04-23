package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/mailerlite/mailerlite-go"
)

var client *mailerlite.Client

func init() {
	apiKey := os.Getenv("MAILERLITE_API_KEY")
	if apiKey == "" {
		log.Fatal("MAILERLITE_API_KEY environment variable not set")
	}
	client = mailerlite.NewClient(apiKey)
}

func subscribeHandler(c *fiber.Ctx) error {
	type SubscribeRequest struct {
		Email string `json:"email"`
	}

	var req SubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Basic email validation (consider a more robust library for production)
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email is required",
		})
	}

	subscriber := &mailerlite.UpsertSubscriber{
		Email: req.Email,
		// You might want to add fields, groups, status etc. here
		// Fields: map[string]interface{}{"name": "John Doe"}, // Example
		// Groups: []string{"your_group_id"}, // Example
		// Status: "active", // Example: active, unsubscribed, unconfirmed, bounced, junk
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	newSubscriber, _, err := client.Subscriber.Upsert(ctx, subscriber)
	if err != nil {
		log.Printf("MailerLite Upsert error for %s: %v", req.Email, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(), // expose l’erreur brute
		})
	}

	log.Printf("Successfully subscribed email: %s", newSubscriber.Data.Email)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Subscription successful ✨",
		"email":   newSubscriber.Data.Email,
	})
}

func main() {
	app := fiber.New()

	// Apply CORS middleware BEFORE defining routes
	app.Use(cors.New(cors.Config{
		// Allow specific origins, including localhost for development and www subdomain
		AllowOrigins: "https://leakr.net, https://www.leakr.net, https://*.leakr.net, https://mailing.leakr.net, http://localhost:3000",
		// Allow only POST method and potentially OPTIONS for preflight requests
		AllowMethods: "POST, OPTIONS",
		// Allow necessary headers, Content-Type is common for JSON APIs
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Define the route for subscribing
	app.Post("/subscribe", subscribeHandler)

	// Get port from environment variable or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port if not specified
	}

	log.Printf("Starting mailing list service on port %s", port)
	// Start the server
	log.Fatal(app.Listen(":" + port))
}
