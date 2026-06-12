export type Role = "owner" | "admin" | "member"

export interface AllowedUser {
  email: string
  role: Role
}

export interface Product {
  id: string
  name: string
  timesSelected: number
}

export interface ListProduct {
  productId: string
  name: string
  quantity: number
  checked?: boolean
}

export interface ShoppingList {
  id: string
  title: string
  market: string
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  products: ListProduct[]
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}
