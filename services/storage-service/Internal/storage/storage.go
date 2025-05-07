package storage

import (
	"context"
	"fmt"
	"io"
	"sort"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// UploadFile envoie un fichier vers le bucket principal
func (c *Client) UploadFile(ctx context.Context, key string, body io.Reader) error {
	_, err := c.S3.PutObject(ctx, &s3.PutObjectInput{
		Bucket: &c.BucketMain,
		Key:    &key,
		Body:   body,
	})
	return err
}

// DownloadByFilename récupère un objet spécifique
func (c *Client) DownloadByFilename(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := c.S3.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &c.BucketMain,
		Key:    &key,
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// DownloadLatestByUser liste et retourne le plus récent backup d'un utilisateur
func (c *Client) DownloadLatestByUser(ctx context.Context, uuid string) (io.ReadCloser, error) {
	prefix := fmt.Sprintf("leakr_db_%s_", uuid)
	list, err := c.S3.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: &c.BucketMain,
		Prefix: &prefix,
	})
	if err != nil {
		return nil, err
	}

	if len(list.Contents) == 0 {
		return nil, fmt.Errorf("aucun backup trouvé pour l'utilisateur %s", uuid)
	}

	sort.Slice(list.Contents, func(i, j int) bool {
		iTime := list.Contents[i].LastModified
		jTime := list.Contents[j].LastModified
		return iTime.After(*jTime)
	})

	latest := list.Contents[0].Key
	return c.DownloadByFilename(ctx, *latest)
}
