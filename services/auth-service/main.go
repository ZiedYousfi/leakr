package main

import (
  "log"
  "net/http"
  "os"

  "github.com/joho/godotenv"
  "leakr/services/auth-service/db"
  "leakr/services/auth-service/handlers"
  "leakr/services/auth-service/clerk"
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
