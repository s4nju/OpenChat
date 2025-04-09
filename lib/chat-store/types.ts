import type { Tables } from "@/app/types/database.types"

export type Chat = Tables<"chats">
export type Message = Tables<"messages"> & {
  parent_message_id?: number | null
}
export type Chats = Pick<
  Chat,
  "id" | "title" | "created_at" | "model" | "system_prompt"
>
