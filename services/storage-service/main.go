package main

import (
	"context"
	"fmt"
	"log"
	"storage-service/internal/config"
	"storage-service/internal/storage"
	"storage-service/middleware" // Import the middleware package

	"github.com/gofiber/fiber/v2"
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
	ctx := context.Background()
	r2client, err := storage.NewClient(ctx, accountID, accessKey, secretKey, bucketMain, bucketBackup)
	if err != nil {
		log.Fatalf("Erreur d'initialisation du client R2: %v", err)
	}

	app := fiber.New()

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
		reader, err := r2client.DownloadLatestByUser(ctx, uuid)
		if err != nil {
			return fiber.ErrNotFound
		}
		defer reader.Close()
		return c.SendStream(reader)
	})

	// Route: Download by filename
	app.Get("/download/file/:filename", func(c *fiber.Ctx) error {
		filename := c.Params("filename")
		reader, err := r2client.DownloadByFilename(ctx, filename)
		if err != nil {
			return fiber.ErrNotFound
		}
		defer reader.Close()
		return c.SendStream(reader)
	})

	// Route: Backup (future)
	app.Post("/backup", func(c *fiber.Ctx) error {
		return c.SendString("Fonctionnalité backup à implémenter")
	})

	log.Fatal(app.Listen(":8080"))
}
