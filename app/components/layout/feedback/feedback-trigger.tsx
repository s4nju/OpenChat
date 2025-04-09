"use client"

import { FeedbackWidget } from "@/app/components/chat/feedback-widget"

type FeedbackTriggerProps = {
  authUserId?: string
}

export function FeedbackTrigger({ authUserId }: FeedbackTriggerProps) {
  return <FeedbackWidget authUserId={authUserId} />
} 