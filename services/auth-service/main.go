package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type introspectResp struct {
	Active bool   `json:"active"`
	Sub    string `json:"sub"`
	Exp    int64  `json:"exp"`
	Iat    int64  `json:"iat"`
}

/* ------------------------------------------------------------------ */
/* Introspection helper                                               */
/* ------------------------------------------------------------------ */
func introspectAccessToken(rawToken string) (*introspectResp, error) {
	clerkBase := os.Getenv("CLERK_BASE_URL") // ex: https://clerk.example.com
	clientID := os.Getenv("CLERK_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("CLERK_OAUTH_CLIENT_SECRET")
	if clerkBase == "" || clientID == "" || clientSecret == "" {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Clerk env vars missing")
	}

	endpoint := clerkBase + "/oauth/token_info"
	data := url.Values{}
	data.Set("token", rawToken)
	data.Set("token_type_hint", "access_token")

	req, _ := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
	req.SetBasicAuth(clientID, clientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fiber.NewError(resp.StatusCode, "introspection failed: "+string(body))
	}

	var out introspectResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

/* ------------------------------------------------------------------ */
/* Fiber App                                                          */
/* ------------------------------------------------------------------ */
func main() {
	app := fiber.New()

	app.Post("/verify", verifyHandler)
	app.Get("/me", authMiddleware, meHandler)

	/* ---- Webhook route conservée (inchangée) -------------------- */
	app.Post("/webhooks/clerk", clerkWebhookHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("auth-service listening on :%s", port)
	log.Fatal(app.Listen(":" + port))
}

/* ------------------------------------------------------------------ */
/* Handlers / Middleware                                              */
/* ------------------------------------------------------------------ */
func verifyHandler(c *fiber.Ctx) error {
	token := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
	info, err := introspectAccessToken(token)
	if err != nil || !info.Active {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}

	return c.JSON(fiber.Map{
		"user_id":    info.Sub,
		"issued_at":  time.Unix(info.Iat, 0),
		"expires_at": time.Unix(info.Exp, 0),
	})
}

func authMiddleware(c *fiber.Ctx) error {
	token := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
	info, err := introspectAccessToken(token)
	if err != nil || !info.Active {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}
	c.Locals("tokenInfo", info)
	return c.Next()
}

func meHandler(c *fiber.Ctx) error {
	info, ok := c.Locals("tokenInfo").(*introspectResp)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "context_miss"})
	}
	return c.JSON(fiber.Map{
		"user_id":    info.Sub,
		"issued_at":  time.Unix(info.Iat, 0),
		"expires_at": time.Unix(info.Exp, 0),
	})
}

/* ------------------------------------------------------------------ */
/* Webhook (conserve l'ancien code, simplifié – signature à ajouter)  */
/* ------------------------------------------------------------------ */
type ClerkWebhookEvent struct {
	Data json.RawMessage `json:"data"`
	Type string          `json:"type"`
}
type ClerkUserData struct {
	ID       string  `json:"id"`
	Username *string `json:"username"`
}
type DBServiceCreateUserPayload struct {
	ClerkUserID string  `json:"clerk_user_id"`
	Username    *string `json:"username"`
}

func clerkWebhookHandler(c *fiber.Ctx) error {
	var event ClerkWebhookEvent
	if err := c.BodyParser(&event); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot_parse"})
	}
	if event.Type != "user.created" {
		return c.JSON(fiber.Map{"message": "ignored"})
	}

	var user ClerkUserData
	if err := json.Unmarshal(event.Data, &user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_data"})
	}

	dbURL := os.Getenv("DB_SERVICE_URL")
	if dbURL == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db_url_missing"})
	}

	payload := DBServiceCreateUserPayload{ClerkUserID: user.ID, Username: user.Username}
	buf, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", dbURL+"/users", bytes.NewBuffer(buf))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode >= 300 {
		return c.Status(fiber.StatusFailedDependency).JSON(fiber.Map{"error": "db_service_fail"})
	}
	return c.JSON(fiber.Map{"message": "webhook_ok"})
}
