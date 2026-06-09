export type Role = "owner" | "admin" | "member"

export interface AllowedUser {
  email: string
  role: Role
}

export interface ShoppingList {
  id: string
  title: string
  market: string
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  products: never[]
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}
