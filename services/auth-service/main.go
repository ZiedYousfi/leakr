package main

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

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
