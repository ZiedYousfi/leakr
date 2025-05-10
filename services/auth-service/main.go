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
	Sess   string `json:"sess,omitempty"`
}

type ExchangeCodePayload struct {
	Code         string `json:"code"`
	RedirectURI  string `json:"redirect_uri"`
	CodeVerifier string `json:"code_verifier"`
}

type RefreshTokenPayload struct {
	RefreshToken string `json:"refresh_token"`
}

// Generic response for proxying token endpoint responses
type TokenResponse map[string]interface{}

/* ------------------------------------------------------------------ */
/* Introspection helper (Original HTTP Call to /oauth/token_info)     */
/* ------------------------------------------------------------------ */
func introspectAccessToken(rawToken string) (*introspectResp, error) {
	clerkBase := os.Getenv("CLERK_BASE_URL") // e.g., https://your-clerk-instance.clerk.accounts.dev
	clientID := os.Getenv("CLERK_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("CLERK_OAUTH_CLIENT_SECRET")
	if clerkBase == "" || clientID == "" || clientSecret == "" {
		log.Println("Error: Clerk environment variables missing for introspection (CLERK_BASE_URL, CLERK_OAUTH_CLIENT_ID, CLERK_OAUTH_CLIENT_SECRET)")
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Clerk OAuth env vars missing for introspection")
	}

	endpoint := clerkBase + "/oauth/token_info"
	data := url.Values{}
	data.Set("token", rawToken)
	data.Set("token_type_hint", "access_token") // Recommended by RFC 7662

	req, err := http.NewRequest("POST", endpoint, strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("Error creating introspection request: %v\\n", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create introspection request")
	}
	req.SetBasicAuth(clientID, clientSecret) // Basic Auth for client credentials
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Error performing introspection request: %v\\n", err)
		return nil, fiber.NewError(fiber.StatusBadGateway, "Clerk introspection endpoint communication error")
	}
	defer resp.Body.Close()

	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		log.Printf("Error reading introspection response body: %v\\n", readErr)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Error reading introspection response")
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Introspection failed with status %d: %s\\n", resp.StatusCode, string(bodyBytes))
		// Return the body from Clerk as the error message if introspection fails
		return nil, fiber.NewError(resp.StatusCode, "Introspection failed: "+string(bodyBytes))
	}

	var out introspectResp
	if err := json.Unmarshal(bodyBytes, &out); err != nil {
		log.Printf("Error decoding introspection response JSON: %v\\nBody: %s\\n", err, string(bodyBytes))
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Error decoding introspection response")
	}
	return &out, nil
}

/* ------------------------------------------------------------------ */
/* Fiber App                                                          */
/* ------------------------------------------------------------------ */
func main() {
	app := fiber.New()

	app.Post("/verify", verifyHandler)
	app.Get("/me", authMiddleware, meHandler) // Assumes /me still uses the authMiddleware which uses introspectAccessToken
	app.Post("/oauth/exchange-code", exchangeCodeHandler)
	app.Post("/oauth/refresh-token", refreshTokenHandler)

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
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing_authorization_header"})
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "empty_token"})
	}

	info, err := introspectAccessToken(token)
	if err != nil {
		// introspectAccessToken already logs errors
		// Check if it's a fiber error to return its status code
		if fe, ok := err.(*fiber.Error); ok {
			return c.Status(fe.Code).JSON(fiber.Map{"error": fe.Message})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_introspection_failed"})
	}

	if !info.Active {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token", "active": false})
	}

	return c.JSON(fiber.Map{
		"active":     info.Active, // Explicitly include active status
		"user_id":    info.Sub,
		"issued_at":  time.Unix(info.Iat, 0),
		"expires_at": time.Unix(info.Exp, 0),
	})
}

func authMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "missing_authorization_header"})
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "empty_token"})
	}

	info, err := introspectAccessToken(token)
	if err != nil {
		if fe, ok := err.(*fiber.Error); ok {
			return c.Status(fe.Code).JSON(fiber.Map{"error": fe.Message})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "token_introspection_failed"})
	}
	if !info.Active {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid_token"})
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot_parse_webhook"})
	}
	if event.Type != "user.created" {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "event_type_not_handled", "type": event.Type})
	}

	var user ClerkUserData
	if err := json.Unmarshal(event.Data, &user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot_parse_user_data"})
	}

	dbURL := os.Getenv("DB_SERVICE_URL")
	if dbURL == "" {
		log.Println("Error: DB_SERVICE_URL not set for webhook")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db_service_url_not_configured"})
	}

	payload := DBServiceCreateUserPayload{ClerkUserID: user.ID, Username: user.Username}
	buf, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshalling DB payload for webhook: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error_marshalling_payload"})
	}

	req, err := http.NewRequest("POST", dbURL+"/users", bytes.NewBuffer(buf))
	if err != nil {
		log.Printf("Error creating DB request for webhook: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error_creating_db_request"})
	}
	req.Header.Set("Content-Type", "application/json")
	// Potentially add an auth header if the DB service requires it

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Error sending request to DB service for webhook: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db_service_communication_error"})
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("DB service returned error status %d for webhook: %s\n", resp.StatusCode, string(bodyBytes))
		return c.Status(fiber.StatusFailedDependency).JSON(fiber.Map{"error": "db_service_error", "details": string(bodyBytes)})
	}
	return c.JSON(fiber.Map{"message": "webhook_ok"})
}

/* ------------------------------------------------------------------ */
/* New Handlers for OAuth Token Exchange and Refresh                  */
/* ------------------------------------------------------------------ */

func exchangeCodeHandler(c *fiber.Ctx) error {
	var payload ExchangeCodePayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request_payload", "details": err.Error()})
	}

	if payload.Code == "" || payload.RedirectURI == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_code_or_redirect_uri"})
	}
	if payload.CodeVerifier == "" { // PKCE requires code_verifier
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_code_verifier"})
	}

	clerkBaseURL := os.Getenv("CLERK_BASE_URL")
	clientID := os.Getenv("CLERK_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("CLERK_OAUTH_CLIENT_SECRET")

	if clerkBaseURL == "" || clientID == "" || clientSecret == "" {
		log.Println("Error: Clerk OAuth environment variables missing for token exchange (CLERK_BASE_URL, CLERK_OAUTH_CLIENT_ID, CLERK_OAUTH_CLIENT_SECRET)")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "clerk_oauth_config_missing"})
	}

	tokenEndpoint := clerkBaseURL + "/oauth/token"
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("code", payload.Code)
	data.Set("redirect_uri", payload.RedirectURI)
	data.Set("code_verifier", payload.CodeVerifier) // Send code_verifier for PKCE

	req, err := http.NewRequest("POST", tokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("Error creating token exchange request: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Error performing token exchange request: %v\n", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "clerk_communication_error"})
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading token exchange response body: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error_reading_response"})
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Clerk token exchange failed with status %d: %s\n", resp.StatusCode, string(bodyBytes))
		// Try to parse Clerk's error response if it's JSON
		var clerkError fiber.Map
		if json.Unmarshal(bodyBytes, &clerkError) == nil {
			return c.Status(resp.StatusCode).JSON(clerkError)
		}
		return c.Status(resp.StatusCode).SendString("clerk_token_exchange_failed: " + string(bodyBytes))
	}

	// Proxy the successful JSON response from Clerk
	c.Set("Content-Type", "application/json")
	return c.Status(http.StatusOK).Send(bodyBytes)
}

func refreshTokenHandler(c *fiber.Ctx) error {
	var payload RefreshTokenPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_request_payload", "details": err.Error()})
	}

	if payload.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_refresh_token"})
	}

	clerkBaseURL := os.Getenv("CLERK_BASE_URL")
	clientID := os.Getenv("CLERK_OAUTH_CLIENT_ID")
	clientSecret := os.Getenv("CLERK_OAUTH_CLIENT_SECRET")

	if clerkBaseURL == "" || clientID == "" || clientSecret == "" {
		log.Println("Error: Clerk OAuth environment variables missing for token refresh")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "clerk_oauth_config_missing"})
	}

	tokenEndpoint := clerkBaseURL + "/oauth/token"
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("refresh_token", payload.RefreshToken)

	req, err := http.NewRequest("POST", tokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("Error creating token refresh request: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error"})
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Error performing token refresh request: %v\n", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "clerk_communication_error"})
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading token refresh response body: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_server_error_reading_response"})
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Clerk token refresh failed with status %d: %s\n", resp.StatusCode, string(bodyBytes))
		var clerkError fiber.Map
		if json.Unmarshal(bodyBytes, &clerkError) == nil {
			return c.Status(resp.StatusCode).JSON(clerkError)
		}
		return c.Status(resp.StatusCode).SendString("clerk_token_refresh_failed: " + string(bodyBytes))
	}

	c.Set("Content-Type", "application/json")
	return c.Status(http.StatusOK).Send(bodyBytes)
}
