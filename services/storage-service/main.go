package main

import (
	"context"
	"fmt"
	"log"
	"storage-service/internal/config"
	"storage-service/internal/storage"
	"time"

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

	// Route: Upload
	app.Post("/upload", func(c *fiber.Ctx) error {
		file, err := c.FormFile("file")
		if err != nil {
			return fiber.ErrBadRequest
		}
		f, err := file.Open()
		if err != nil {
			return fiber.ErrInternalServerError
		}
		defer f.Close()

		// Générer clé: leakr_db_uuid_timestamp_it1.sqlite
		key := fmt.Sprintf("leakr_db_%s_%d_it1.sqlite", "user-uuid", time.Now().Unix())
		if err := r2client.UploadFile(ctx, key, f);
		 err != nil {
			return fiber.ErrInternalServerError
		}
		return c.SendString("Upload réussi: " + key)
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
