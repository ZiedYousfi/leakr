package middleware

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// The previous bypass for POST /users has been removed.
		// All routes using this middleware will now require authentication.
		// If specific public routes are needed in the future for this service,
		// they should be configured in main.go to not use this middleware,
		// or a more sophisticated role/permission system should be implemented.

		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing_token"})
		}

		// Check if the token is a Bearer token
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token_format"})
		}

		// Appel HTTP au service d'auth
		verifyURL := os.Getenv("AUTH_SERVICE_URL") + "/verify"

		req, err := http.NewRequest("POST", verifyURL, nil)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "internal_error"})
		}
		req.Header.Set("Authorization", authHeader)

		resp, err := http.DefaultClient.Do(req)
		if err != nil || resp.StatusCode != 200 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		var claims map[string]any
		if err := json.Unmarshal(body, &claims); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "malformed_response"})
		}

		// Stocker les claims dans le contexte
		c.Locals("claims", claims)

		return c.Next()
	}
}
