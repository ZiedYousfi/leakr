package clerk

import (
    "context"
    "os"

    "github.com/clerk/clerk-sdk-go/v2"
    "github.com/clerk/clerk-sdk-go/v2/jwt"
)

// InitClerk initialise Clerk en configurant la clé secrète.
// Panique si la variable d'environnement CLERK_SECRET_KEY n'est pas définie.
func InitClerk() {
    secretKey := os.Getenv("CLERK_SECRET_KEY")
    if secretKey == "" {
        panic("CLERK_SECRET_KEY environment variable not set")
    }
    clerk.SetKey(secretKey)
}

// VerifyToken vérifie le JWT de session et renvoie l'ID de l'utilisateur (Subject).
func VerifyToken(ctx context.Context, token string) (string, error) {
    // Vérification du token sans JWK explicite : le JWK sera récupéré et mis en cache automatiquement.
    claims, err := jwt.Verify(ctx, &jwt.VerifyParams{
        Token: token,
    })
    if err != nil {
        return "", err
    }
    return claims.Subject, nil
}
