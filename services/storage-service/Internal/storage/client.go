package storage

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Client encapsule un client S3 configuré pour Cloudflare R2
type Client struct {
	S3     *s3.Client
	BucketMain   string
	BucketBackup string
}

// NewClient initialise un client AWS S3 connecté à R2
func NewClient(ctx context.Context, accountID, accessKey, secretKey, mainBucket, backupBucket string) (*Client, error) {
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if service == s3.ServiceID {
			endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
			return aws.Endpoint{URL: endpoint, SigningRegion: "auto"}, nil
		}
		return aws.Endpoint{}, fmt.Errorf("unknown endpoint requested")
	})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithCredentialsProvider(
			aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
				return aws.Credentials{
					AccessKeyID: accessKey,
					SecretAccessKey: secretKey,
				}, nil
			})),
		config.WithEndpointResolverWithOptions(resolver),
	)
	if err != nil {
		return nil, err
	}

	s3Client := s3.NewFromConfig(cfg)
	return &Client{S3: s3Client, BucketMain: mainBucket, BucketBackup: backupBucket}, nil
}
