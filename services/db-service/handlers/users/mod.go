package user

import (
    "context"
    "strconv"

    "github.com/gofiber/fiber/v2"
    // Replace with the actual path to your generated ent client
    "db-service/ent"
    // Replace with the actual path to your generated user package
    "db-service/ent/user"
)

// UserHandler holds the ent client.
type UserHandler struct {
    Client *ent.Client
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(client *ent.Client) *UserHandler {
    return &UserHandler{Client: client}
}

// CreateUser handles POST requests to create a new user.
// Note: In a real app, you'd likely get the clerk_user_id from auth middleware,
// and other fields might be set differently. This is a basic example.
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
    type CreateUserInput struct {
        ClerkUserID      string `json:"clerk_user_id" validate:"required"`
        Role             string `json:"role"`
        IsSubscribed     bool   `json:"is_subscribed"`
        SubscriptionTier string `json:"subscription_tier"`
    }

    input := new(CreateUserInput)
    if err := c.BodyParser(input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
    }

    // Add validation logic here if needed (e.g., using a validation library)

    newUser, err := h.Client.User.
        Create().
        SetClerkUserID(input.ClerkUserID).
        SetNillableRole(optionalString(input.Role, "user")). // Use default if empty
        SetIsSubscribed(input.IsSubscribed).
        SetNillableSubscriptionTier(optionalString(input.SubscriptionTier, "free")). // Use default if empty
        // created_at and updated_at are set by default hooks
        Save(context.Background()) // Use request context in real app

    if err != nil {
        // Handle potential constraint errors (e.g., unique clerk_user_id)
        if ent.IsConstraintError(err) {
            return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "User with this Clerk ID already exists"})
        }
        // Log the error internally
        // log.Printf("Error creating user: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
    }

    return c.Status(fiber.StatusCreated).JSON(newUser)
}

// GetUser handles GET requests to retrieve a user by ID.
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
    idParam := c.Params("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
    }

    u, err := h.Client.User.
        Query().
        Where(user.ID(id)).
        Only(context.Background()) // Use request context in real app

    if err != nil {
        if ent.IsNotFound(err) {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
        }
        // Log the error internally
        // log.Printf("Error fetching user %d: %v", id, err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve user"})
    }

    return c.Status(fiber.StatusOK).JSON(u)
}

// ListUsers handles GET requests to retrieve all users (add pagination in real app).
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
    // Add pagination parameters (e.g., ?page=1&limit=20) in a real application
    users, err := h.Client.User.
        Query().
        // Add Order(), Limit(), Offset() for pagination and sorting
        All(context.Background()) // Use request context in real app

    if err != nil {
        // Log the error internally
        // log.Printf("Error listing users: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve users"})
    }

    return c.Status(fiber.StatusOK).JSON(users)
}

// UpdateUser handles PUT/PATCH requests to update a user by ID.
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
    idParam := c.Params("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
    }

    type UpdateUserInput struct {
        Role             *string `json:"role"`              // Use pointers to distinguish between empty and not provided
        IsSubscribed     *bool   `json:"is_subscribed"`
        SubscriptionTier *string `json:"subscription_tier"`
        // clerk_user_id is likely immutable or managed elsewhere
    }

    input := new(UpdateUserInput)
    if err := c.BodyParser(input); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
    }

    updater := h.Client.User.UpdateOneID(id)

    if input.Role != nil {
        updater.SetRole(*input.Role)
    }
    if input.IsSubscribed != nil {
        updater.SetIsSubscribed(*input.IsSubscribed)
    }
    if input.SubscriptionTier != nil {
        updater.SetSubscriptionTier(*input.SubscriptionTier)
    }
    // updated_at is handled by the UpdateDefault hook

    updatedUser, err := updater.Save(context.Background()) // Use request context in real app

    if err != nil {
        if ent.IsNotFound(err) {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
        }
        // Log the error internally
        // log.Printf("Error updating user %d: %v", id, err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
    }

    return c.Status(fiber.StatusOK).JSON(updatedUser)
}

// DeleteUser handles DELETE requests to delete a user by ID.
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
    idParam := c.Params("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID format"})
    }

    err = h.Client.User.
        DeleteOneID(id).
        Exec(context.Background()) // Use request context in real app

    if err != nil {
        if ent.IsNotFound(err) {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
        }
        // Log the error internally
        // log.Printf("Error deleting user %d: %v", id, err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete user"})
    }

    return c.SendStatus(fiber.StatusNoContent) // 204 No Content on successful deletion
}

// Helper function to handle optional string fields with defaults
func optionalString(val string, defaultVal string) *string {
    if val == "" {
        return &defaultVal
    }
    return &val
}

func SetupRoutes(app *fiber.App, client *ent.Client) {
    userHandler := NewUserHandler(client)

    userGroup := app.Group("/users") // Example base path

    userGroup.Post("/", userHandler.CreateUser)
    userGroup.Get("/", userHandler.ListUsers)
    userGroup.Get("/:id", userHandler.GetUser)
    userGroup.Put("/:id", userHandler.UpdateUser)    // Or Patch
    userGroup.Delete("/:id", userHandler.DeleteUser)
}


