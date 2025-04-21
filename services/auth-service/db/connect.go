package db

import (
  "context"
  "log"
  "os"
  "github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func InitDB() {
  var err error
  Pool, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
  if err != nil {
    log.Fatalf("❌ DB connection failed: %v", err)
  }
  log.Println("✅ Connected to Neon")
}
