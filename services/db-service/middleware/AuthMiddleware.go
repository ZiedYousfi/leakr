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
		// Allow POST requests to /users to bypass auth (for service-to-service communication from auth-service webhook)
		// WARNING: This is a simplification. In production, use a more secure mechanism
		// like a pre-shared secret header or mTLS for service-to-service auth.
		if c.Path() == "/users" && c.Method() == fiber.MethodPost {
			// Optionally, you could check for a specific internal API key header here
			// internalAPIKey := c.Get("X-Internal-API-Key")
			// if internalAPIKey == os.Getenv("INTERNAL_API_KEY") {
			//    return c.Next()
			// }
			// For now, we allow it directly for simplicity of this exercise.
			return c.Next()
		}

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
