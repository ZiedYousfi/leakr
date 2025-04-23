package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
    "entgo.io/ent/schema/edge"
)

// Subscription relie un utilisateur à son abonnement Stripe.
type Subscription struct {
    ent.Schema
}

func (Subscription) Fields() []ent.Field {
    return []ent.Field{
        field.String("stripe_customer_id").
            NotEmpty().
            Unique().
            Comment("ID du client Stripe"),

        field.String("stripe_subscription_id").
            NotEmpty().
            Unique().
            Comment("ID de l'abonnement Stripe"),

        field.String("status").
            Default("inactive").
            Comment("Statut de l'abonnement : active, past_due, canceled, etc."),

        field.Time("current_period_end").
            Optional().
            Comment("Fin de la période actuelle de l'abonnement"),
    }
}

func (Subscription) Edges() []ent.Edge {
    return []ent.Edge{
        edge.From("user", User.Type).
            Ref("subscription").
            Unique().
            Required(),
    }
}
