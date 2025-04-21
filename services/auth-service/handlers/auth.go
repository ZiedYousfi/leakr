package handlers

import (
  "leakr/services/auth-service/clerk"
  "leakr/services/auth-service/db"
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

  userID, err := clerk.VerifyToken(r.Context(), token)
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
