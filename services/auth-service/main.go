package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gofiber/fiber/v2"
)

// ClerkWebhookEvent represents the structure of a Clerk webhook event.
type ClerkWebhookEvent struct {
	Data   json.RawMessage `json:"data"`
	Object string          `json:"object"`
	Type   string          `json:"type"`
}

// ClerkUserData represents the user data within a Clerk webhook event.
type ClerkUserData struct {
	ID       string  `json:"id"`
	Username *string `json:"username"` // Added username
	// Add other fields if needed
}

// DBServiceCreateUserPayload is the payload sent to db-service to create a user.
type DBServiceCreateUserPayload struct {
	ClerkUserID string  `json:"clerk_user_id"`
	Username    *string `json:"username"` // Added username
	// Role, IsSubscribed, SubscriptionTier will use defaults in db-service
}

func main() {
	// 1) Création de l'application Fiber
	app := fiber.New()

	// 2) Chargement de la clé secrète Clerk depuis les variables d'environnement
	secret := os.Getenv("CLERK_SECRET_KEY")
	if secret == "" {
		log.Fatal("CLERK_SECRET_KEY is not set")
	}
	clerk.SetKey(secret)

	// 3) Déclaration des routes
	app.Post("/verify", verifyHandler)
	app.Get("/me", authMiddleware, meHandler)
	app.Post("/webhooks/clerk", clerkWebhookHandler) // New webhook route

	// 4) Lancement du serveur
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting auth-service on port %s...", port)
	log.Fatal(app.Listen(":" + port))
}

// verifyHandler gère POST /verify, valide le token et renvoie les claims
func verifyHandler(c *fiber.Ctx) error {
	// Extraction du token depuis le header Authorization
	auth := c.Get("Authorization")
	token := strings.TrimPrefix(auth, "Bearer ")

	// Vérification du jeton avec Clerk JWT (manuelle, sans caching automatique)
	// Récupération de la clé publique JWK et vérification
	// Ici, pour simplifier, on laisse Clerk middleware gérer le caching via JWTVerifyOptions
	claimsProto, err := jwt.Verify(c.Context(), &jwt.VerifyParams{Token: token})
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_token"})
	}

	// claimsProto est de type *clerk.SessionClaims
	claims := claimsProto

	// Préparation des timestamps
	issuedAt := time.Unix(*claims.RegisteredClaims.IssuedAt, 0)
	expiresAt := time.Unix(*claims.RegisteredClaims.Expiry, 0)

	// Retourne les claims validés
	return c.JSON(fiber.Map{
		"session_id": claims.Claims.SessionID,
		"user_id":    claims.RegisteredClaims.Subject,
		"issued_at":  issuedAt,
		"expires_at": expiresAt,
	})
}

// authMiddleware protège les routes en validant le token
func authMiddleware(c *fiber.Ctx) error {
	// Extraction du token
	auth := c.Get("Authorization")
	token := strings.TrimPrefix(auth, "Bearer ")

	// Vérification JWT
	claims, err := jwt.Verify(c.Context(), &jwt.VerifyParams{Token: token})
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}

	// Injection des claims de type *clerk.SessionClaims dans le contexte Fiber
	c.Locals("claims", claims)
	return c.Next()
}

// meHandler gère GET /me, renvoie les informations de l'utilisateur extraites des claims
func meHandler(c *fiber.Ctx) error {
	// Récupération des claims depuis le contexte
	claims, ok := c.Locals("claims").(*clerk.SessionClaims)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "claims_not_found"})
	}

	// Préparation des timestamps
	issuedAt := time.Unix(*claims.RegisteredClaims.IssuedAt, 0)
	expiresAt := time.Unix(*claims.RegisteredClaims.Expiry, 0)

	// Renvoi d'une vue minimale de l'utilisateur
	return c.JSON(fiber.Map{
		"session_id": claims.Claims.SessionID,
		"user_id":    claims.RegisteredClaims.Subject,
		"issued_at":  issuedAt,
		"expires_at": expiresAt,
	})
}

// clerkWebhookHandler handles incoming webhooks from Clerk
func clerkWebhookHandler(c *fiber.Ctx) error {
	// IMPORTANT: In a production environment, you MUST verify the webhook signature.
	// This involves using the Svix library and your Clerk webhook secret.
	// Example:
	// wh, err := svix.NewWebhook("whsec_...")
	// if err != nil { /* handle error */ }
	// payload := c.Body()
	// headers := c.GetReqHeaders()
	// err = wh.Verify(payload, headers)
	// if err != nil { return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid_signature"}) }
	// For this example, we'll skip signature verification.

	var event ClerkWebhookEvent
	if err := c.BodyParser(&event); err != nil {
		log.Printf("Error parsing webhook body: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot_parse_json"})
	}

	log.Printf("Received webhook event type: %s", event.Type)

	if event.Type == "user.created" {
		var userData ClerkUserData
		if err := json.Unmarshal(event.Data, &userData); err != nil {
			log.Printf("Error parsing user data from webhook: %v", err)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot_parse_user_data"})
		}

		if userData.ID == "" {
			log.Printf("Clerk User ID is missing in webhook data")
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing_user_id"})
		}

		log.Printf("Processing user.created event for Clerk User ID: %s", userData.ID)

		// Call db-service to create the user
		dbServiceURL := os.Getenv("DB_SERVICE_URL")
		if dbServiceURL == "" {
			log.Println("DB_SERVICE_URL environment variable not set")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db_service_url_not_configured"})
		}

		payload := DBServiceCreateUserPayload{
			ClerkUserID: userData.ID,
			Username:    userData.Username, // Pass username
		}
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			log.Printf("Error marshalling payload for db-service: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error_marshalling_payload"})
		}

		req, err := http.NewRequest("POST", dbServiceURL+"/users", bytes.NewBuffer(payloadBytes))
		if err != nil {
			log.Printf("Error creating request to db-service: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal_error_creating_request"})
		}
		req.Header.Set("Content-Type", "application/json")
		// Add any service-to-service auth headers if db-service expects them in the future

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Error calling db-service: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "db_service_call_failed"})
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			log.Printf("Successfully created user %s in db-service", userData.ID)
			return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "webhook_processed_user_created"})
		}

		// Log error from db-service
		var errResp map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&errResp); err == nil {
			log.Printf("Error from db-service (status %d): %v", resp.StatusCode, errResp)
		} else {
			log.Printf("Error from db-service (status %d), could not parse error response body", resp.StatusCode)
		}
		return c.Status(fiber.StatusFailedDependency).JSON(fiber.Map{"error": "failed_to_create_user_in_db", "details": errResp})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "webhook_received_event_not_handled"})
}
