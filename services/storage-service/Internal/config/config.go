package config

import (
	"log"
	"github.com/joho/godotenv"
	"os"
)

// LoadEnv charge les variables d'environnement depuis .env
func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("Aucun fichier .env trouvé, en utilisant les variables d'environnement du système")
	}
}

func GetEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("La variable %s est requise", key)
	}
	return val
}
