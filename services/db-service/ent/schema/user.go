package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// User maps your internal users linked to Clerk.
type User struct {
	ent.Schema
}

// Fields defines the fields for the User entity.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),

		field.String("clerk_user_id").
			NotEmpty().
			Unique().
			Comment("ID utilisateur fourni par Clerk"),

		field.String("username").
			Optional().
			Comment("Nom d'utilisateur, peut provenir de Clerk"),

		field.String("role").
			Default("user").
			Comment("Rôle interne de l'utilisateur"),

		field.Bool("is_subscribed").
			Default(false).
			Comment("Indique si l'utilisateur a un abonnement actif Stripe"),

		field.String("subscription_tier").
			Default("free").
			Comment("Niveau d'abonnement : free, basic, premium, etc."),

		field.Time("created_at").
			Default(func() time.Time { return time.Now() }).
			Immutable(),

		field.Time("updated_at").
			Default(func() time.Time { return time.Now() }).
			UpdateDefault(func() time.Time { return time.Now() }),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("subscription", Subscription.Type),
	}
}
