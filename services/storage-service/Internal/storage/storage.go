package storage

import (
	"context"
	"fmt"
	"io"
	"log" // Added for logging parsing errors
	"regexp"
	"sort"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// FileInfo holds parsed data from a backup filename
type FileInfo struct {
	Filename  string `json:"filename"`
	UserID    string `json:"userID"`
	Timestamp string `json:"timestamp"`
	Iteration string `json:"iteration"`
}

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
// "Latest" is determined by GetLatestFileInfoByUser logic (iteration then S3 timestamp)
func (c *Client) DownloadLatestByUser(ctx context.Context, uuid string) (io.ReadCloser, error) {
	fileInfos, err := c.GetLatestFileInfoByUser(ctx, uuid)
	if err != nil {
		// Pass through the error, which could be "aucun backup trouvé" or parsing errors
		return nil, err
	}

	// GetLatestFileInfoByUser should return an error if no valid files are found,
	// so fileInfos slice should not be empty if err is nil.
	// However, a defensive check is good.
	if len(fileInfos) == 0 {
		return nil, fmt.Errorf("aucun fichier d'information de backup trouvé pour l'utilisateur %s après traitement", uuid)
	}

	// The first element is always the one determined by iteration first, then timestamp.
	return c.DownloadByFilename(ctx, fileInfos[0].Filename)
}

// GetLatestFileInfoByUser retrieves information about relevant backup files for a user.
// It can return one or two FileInfo objects:
// 1. The file with the highest iteration, then newest filename timestamp. (Always first in the slice)
// 2. If different from the first, the file with the newest filename timestamp, then highest iteration.
func (c *Client) GetLatestFileInfoByUser(ctx context.Context, userUUID string) ([]*FileInfo, error) {
	prefix := fmt.Sprintf("leakr_db_%s_", userUUID)
	list, err := c.S3.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: &c.BucketMain, // Ensures "only in the main bucket"
		Prefix: &prefix,
	})
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la liste des objets S3: %w", err)
	}

	if len(list.Contents) == 0 {
		return nil, fmt.Errorf("aucun backup trouvé pour l'utilisateur %s", userUUID)
	}

	const filenameTimestampLayout = "2006-01-02 15:04:05"

	type parsedObjectInfo struct {
		s3Object          types.Object
		filename          string
		userID            string
		timestampStr      string
		iterationStr      string
		iteration         int
		filenameTimestamp time.Time
	}

	var parsedObjects []parsedObjectInfo
	reFull := regexp.MustCompile(`^leakr_db_([^_]+)_([^_]+)_it([0-9]+)\.sqlite$`)

	for _, item := range list.Contents {
		if item.Key == nil {
			continue
		}
		filename := *item.Key
		matches := reFull.FindStringSubmatch(filename)

		if len(matches) != 4 {
			log.Printf("Skipping file with unexpected format: %s", filename)
			continue
		}

		userIDFromFile := matches[1]
		timestampStrFromFile := matches[2]
		iterationStrFromFile := matches[3]

		iteration, convErr := strconv.Atoi(iterationStrFromFile)
		if convErr != nil {
			log.Printf("Skipping file due to iteration parsing error for %s: %v", filename, convErr)
			continue
		}

		filenameTime, timeParseErr := time.Parse(filenameTimestampLayout, timestampStrFromFile)
		if timeParseErr != nil {
			log.Printf("Skipping file due to timestamp parsing error for %s (layout: %s, value: %s): %v", filename, filenameTimestampLayout, timestampStrFromFile, timeParseErr)
			continue
		}

		parsedObjects = append(parsedObjects, parsedObjectInfo{
			s3Object:          item,
			filename:          filename,
			userID:            userIDFromFile,
			timestampStr:      timestampStrFromFile,
			iterationStr:      iterationStrFromFile,
			iteration:         iteration,
			filenameTimestamp: filenameTime,
		})
	}

	if len(parsedObjects) == 0 {
		return nil, fmt.Errorf("aucun fichier valide (après filtrage et parsing) trouvé pour l'utilisateur %s", userUUID)
	}

	// Candidate 1: Highest iteration, then newest filename timestamp
	sort.SliceStable(parsedObjects, func(i, j int) bool {
		if parsedObjects[i].iteration != parsedObjects[j].iteration {
			return parsedObjects[i].iteration > parsedObjects[j].iteration
		}
		return parsedObjects[i].filenameTimestamp.After(parsedObjects[j].filenameTimestamp)
	})
	latestByIterThenTime := parsedObjects[0]

	// Candidate 2: Newest filename timestamp, then highest iteration
	// We sort again as the criteria are different.
	sort.SliceStable(parsedObjects, func(i, j int) bool {
		if parsedObjects[i].filenameTimestamp.Equal(parsedObjects[j].filenameTimestamp) {
			return parsedObjects[i].iteration > parsedObjects[j].iteration
		}
		return parsedObjects[i].filenameTimestamp.After(parsedObjects[j].filenameTimestamp)
	})
	latestByTimeThenIter := parsedObjects[0]

	resultInfos := []*FileInfo{
		{
			Filename:  latestByIterThenTime.filename,
			UserID:    latestByIterThenTime.userID,
			Timestamp: latestByIterThenTime.timestampStr,
			Iteration: latestByIterThenTime.iterationStr,
		},
	}

	if latestByIterThenTime.filename != latestByTimeThenIter.filename {
		resultInfos = append(resultInfos, &FileInfo{
			Filename:  latestByTimeThenIter.filename,
			UserID:    latestByTimeThenIter.userID,
			Timestamp: latestByTimeThenIter.timestampStr,
			Iteration: latestByTimeThenIter.iterationStr,
		})
	}

	return resultInfos, nil
}
