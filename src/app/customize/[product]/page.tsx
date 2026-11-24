import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, isProductId } from "@/config/catalog";
import { currentOrderMode } from "@/config/site";
import { Configurator } from "@/components/Configurator";

export function generateStaticParams() {
  return [{ product: "bag" }, { product: "scarf" }];
}

export async function generateMetadata({ params }: { params: Promise<{ product: string }> }): Promise<Metadata> {
  const { product } = await params;
  return { title: isProductId(product) ? `Customize your ${PRODUCTS[product].name.toLowerCase()}` : "Customize" };
}

export default async function CustomizePage({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  if (!isProductId(product)) notFound();
  return <Configurator productId={product} mode={currentOrderMode()} />;
}
