package storage

import (
    "context"
    "fmt"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

// Client encapsule un client S3 configuré pour Cloudflare R2
type Client struct {
    S3           *s3.Client
    BucketMain   string
    BucketBackup string
}

// NewClient initialise un client AWS S3 connecté à R2
func NewClient(
    ctx context.Context,
    accountID, accessKey, secretKey, mainBucket, backupBucket string,
) (*Client, error) {
    // Chargement de la configuration avec identifiants statiques
    cfg, err := config.LoadDefaultConfig(ctx,
        config.WithCredentialsProvider(
            credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
        ),
        config.WithRegion("auto"), // laisse la SDK gérer la signature
    )
    if err != nil {
        return nil, err
    }

    // Construction du client S3 en spécifiant l’endpoint R2
    endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
    s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
        o.BaseEndpoint = aws.String(endpoint)
    })

    return &Client{
        S3:           s3Client,
        BucketMain:   mainBucket,
        BucketBackup: backupBucket,
    }, nil
}
