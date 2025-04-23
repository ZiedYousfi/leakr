# This file contains the routes for each service in the microservices architecture

## storage-service

POST /upload
GET /download?file=...
POST /backup

## auth-service

POST /verify
GET /me

## community-service

TODO: Think about routes for community service

## payment-service

POST /webhook
GET /subscription

## mailing-list-service

POST /subscribe
Body: { "email": "<example@foxmail.com>" }

Call to MailerLite API with secret key.
