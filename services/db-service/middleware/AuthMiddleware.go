package middleware

import (
	"encoding/json"
	"github.com/gofiber/fiber/v2"
	"io"
	"net/http"
	"os"
)

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing_token"})
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
		var claims map[string]interface{}
		if err := json.Unmarshal(body, &claims); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "malformed_response"})
		}

		// Stocker les claims dans le contexte
		c.Locals("claims", claims)

		return c.Next()
	}
}
