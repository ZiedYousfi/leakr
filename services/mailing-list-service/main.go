package main

import (
	"log"
	"os"
	"net/mail"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"bytes"
	"net/http"
)

const mailerLiteAPI = "https://api.mailerlite.com/api/v2/subscribers"

func main() {
	app := fiber.New()
	app.Use(logger.New())

	app.Post("/subscribe", subscribeHandler)

	log.Fatal(app.Listen(":3000"))
	log.Println("mailing-list-service is listening on :3000 ✨")
}

type SubscribeRequest struct {
	Email string `json:"email"`
}

func subscribeHandler(c *fiber.Ctx) error {
	apiKey := os.Getenv("MAILERLITE_API_KEY")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "API key not configured",
		})
	}

	var req SubscribeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate email
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid email address",
		})
	}

	// Prepare request to MailerLite
	jsonStr := []byte(`{"email": "` + req.Email + `"}`)

	httpReq, err := http.NewRequest("POST", mailerLiteAPI, bytes.NewBuffer(jsonStr))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create request",
		})
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-MailerLite-ApiKey", apiKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to contact MailerLite",
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error": "MailerLite API error",
			"status": resp.Status,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Subscription successful ✨",
	})
}
// The code above is a simple Fiber application that listens for POST requests on the /subscribe endpoint.
// It validates the email address, and if valid, it sends a request to the MailerLite API to subscribe the user.
// The API key is read from an environment variable, and the request is sent with the appropriate headers.
