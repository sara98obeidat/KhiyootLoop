import type { Metadata } from "next";
import { currentOrderMode } from "@/config/site";
import { ReviewForm } from "@/components/ReviewForm";

export const metadata: Metadata = { title: "Review your order" };

export default function ReviewPage() {
  return <ReviewForm mode={currentOrderMode()} />;
}
