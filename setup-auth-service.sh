#!/bin/bash

SERVICE_DIR="services/auth-service"

mkdir -p $SERVICE_DIR/{handlers,db,clerk}
touch $SERVICE_DIR/main.go
touch $SERVICE_DIR/handlers/auth.go
touch $SERVICE_DIR/db/connect.go
touch $SERVICE_DIR/clerk/verify.go
touch $SERVICE_DIR/.env

cat > $SERVICE_DIR/main.go << 'EOL'
package main

import (
  "log"
  "net/http"
  "os"

  "github.com/joho/godotenv"
  "auth-service/db"
  "auth-service/handlers"
  "auth-service/clerk"
)

func main() {
  _ = godotenv.Load()

  db.InitDB()
  clerk.InitClerk()

  http.HandleFunc("/auth/check", handlers.AuthCheck)

  port := os.Getenv("PORT")
  log.Println("�� Auth service running on port", port)
  log.Fatal(http.ListenAndServe(":"+port, nil))
}
EOL

cat > $SERVICE_DIR/handlers/auth.go << 'EOL'
package handlers

import (
  "auth-service/clerk"
  "auth-service/db"
  "context"
  "encoding/json"
  "net/http"
  "strings"
)

func AuthCheck(w http.ResponseWriter, r *http.Request) {
  token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
  if token == "" {
    http.Error(w, "Missing token", http.StatusUnauthorized)
    return
  }

  userID, err := clerk.VerifyToken(token)
  if err != nil {
    http.Error(w, "Invalid token", http.StatusUnauthorized)
    return
  }

  _, err = db.Pool.Exec(context.Background(),
    `INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`, userID)
  if err != nil {
    http.Error(w, "DB error", http.StatusInternalServerError)
    return
  }

  json.NewEncoder(w).Encode(map[string]string{
    "user_id": userID,
    "status":  "authenticated",
  })
}
EOL

cat > $SERVICE_DIR/db/connect.go << 'EOL'
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
EOL

cat > $SERVICE_DIR/clerk/verify.go << 'EOL'
package clerk

import (
  "os"
  "github.com/clerkinc/clerk-sdk-go/clerk"
)

var Client clerk.Client

func InitClerk() {
  var err error
  Client, err = clerk.NewClient(os.Getenv("CLERK_SECRET_KEY"))
  if err != nil {
    panic(err)
  }
}

func VerifyToken(token string) (string, error) {
  session, err := Client.VerifyToken(token)
  if err != nil {
    return "", err
  }
  return session.Claims.Subject, nil
}
EOL

cat > $SERVICE_DIR/.env << 'EOL'
DATABASE_URL=postgres://user:password@db.neon.tech/dbname
CLERK_SECRET_KEY=clerk_secret_key_here
PORT=8080
EOL

echo "✅ Auth service structure created at $SERVICE_DIR"
