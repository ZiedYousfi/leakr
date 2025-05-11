package main

import (
	"context"
	"fmt"
	"log"
	"storage-service/internal/config"
	"storage-service/internal/storage"
	"storage-service/middleware" // Import the middleware package
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	// Charger configuration
	config.LoadEnv()

	accountID := config.GetEnv("R2_ACCOUNT_ID")
	accessKey := config.GetEnv("R2_ACCESS_KEY_ID")
	secretKey := config.GetEnv("R2_SECRET_ACCESS_KEY")
	bucketMain := config.GetEnv("R2_BUCKET_MAIN_NAME")
	bucketBackup := config.GetEnv("R2_BUCKET_BACKUP_NAME")

	// Initialiser client R2
	// Global ctx for NewClient is fine, but handlers should use request-specific context.
	globalCtx := context.Background()
	r2client, err := storage.NewClient(globalCtx, accountID, accessKey, secretKey, bucketMain, bucketBackup)
	if err != nil {
		log.Fatalf("Erreur d'initialisation du client R2: %v", err)
	}

	app := fiber.New()

	// Add CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "chrome-extension://iinddcpilfbkhdaijbdhncbhbeginpgn", // Allow specific Chrome extension origin
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Appliquer le middleware d'authentification à toutes les routes
	app.Use(middleware.AuthMiddleware())

	// Route: Upload

	app.Post("/upload", func(c *fiber.Ctx) error {
		file, err := c.FormFile("file")
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "🦊 Fichier manquant ou invalide")
		}
		f, err := file.Open()
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "🐾 Impossible d’ouvrir le fichier")
		}
		defer f.Close()

		filename := c.FormValue("filename")
		if filename == "" {
			return fiber.NewError(fiber.StatusBadRequest, "📛 Le champ filename est requis")
		}

		log.Printf("⏳ Début upload R2 pour '%s'", filename)
		if err := r2client.UploadFile(c.Context(), filename, f); err != nil {
			log.Printf("❌ Erreur r2client.UploadFile : %v", err)
			// On renvoie l’erreur brute pour diagnostiquer côté client
			return fiber.NewError(fiber.StatusInternalServerError,
				fmt.Sprintf("Erreur interne R2 : %v", err))
		}
		log.Printf("✅ Upload R2 terminé : '%s'", filename)
		return c.SendString("Upload réussi : " + filename)
	})

	// Route: Download latest by user
	app.Get("/download/user/:uuid", func(c *fiber.Ctx) error {
		uuid := c.Params("uuid")
		reader, err := r2client.DownloadLatestByUser(c.Context(), uuid) // Use c.Context()
		if err != nil {
			log.Printf("Erreur DownloadLatestByUser pour UUID %s: %v", uuid, err)
			return fiber.NewError(fiber.StatusNotFound, fmt.Sprintf("Aucun backup trouvé pour l'utilisateur %s ou erreur interne.", uuid))
		}
		defer reader.Close()
		// Suggest a filename for the download
		// We need the actual filename. We could fetch it or construct it if predictable.
		// For now, let's try to get it. If DownloadLatestByUser could also return filename, that'd be ideal.
		// As a quick fix, we might need to call GetLatestFileInfoByUser first if we want the exact filename.
		// Or, for simplicity, let the client name it.
		// c.Set(fiber.HeaderContentDisposition, fmt.Sprintf("attachment; filename=\"%s\"", "latest_backup.sqlite"))
		return c.SendStream(reader)
	})

	// Route: Download by filename
	app.Get("/download/file/:filename", func(c *fiber.Ctx) error {
		filename := c.Params("filename")
		reader, err := r2client.DownloadByFilename(c.Context(), filename) // Use c.Context()
		if err != nil {
			log.Printf("Erreur DownloadByFilename pour %s: %v", filename, err)
			return fiber.NewError(fiber.StatusNotFound, fmt.Sprintf("Fichier %s non trouvé ou erreur interne.", filename))
		}
		defer reader.Close()
		c.Set(fiber.HeaderContentDisposition, fmt.Sprintf("attachment; filename=\"%s\"", filename))
		return c.SendStream(reader)
	})

	// Route: Get latest file info by user
	app.Get("/info/user/:uuid", func(c *fiber.Ctx) error {
		uuid := c.Params("uuid")
		fileInfos, err := r2client.GetLatestFileInfoByUser(c.Context(), uuid) // Expects []*FileInfo
		if err != nil {
			log.Printf("Erreur GetLatestFileInfoByUser pour UUID %s: %v", uuid, err)
			// Differentiate between "not found" and other errors
			if strings.Contains(err.Error(), "aucun backup trouvé") || strings.Contains(err.Error(), "aucun fichier valide") {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": fmt.Sprintf("Aucune information de fichier trouvée pour l'utilisateur %s", uuid),
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Erreur interne lors de la récupération des informations du fichier: %v", err),
			})
		}
		// If fileInfos is empty here, it implies a logic flaw in GetLatestFileInfoByUser,
		// as it should return an error if no files are found/parsed.
		// However, to be safe, one might check len(fileInfos) == 0, but current storage logic prevents this with nil error.
		return c.JSON(fileInfos)
	})

	// Route: Backup (future)
	app.Post("/backup", func(c *fiber.Ctx) error {
		return c.SendString("Fonctionnalité backup à implémenter")
	})

	log.Fatal(app.Listen(":8080"))
}
