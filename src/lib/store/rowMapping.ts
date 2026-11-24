import type { NewOrder, OrderRecord } from "../orders";
import type { ProductConfiguration } from "../configuration";

/** Database row shape (snake_case), as stored in public.orders. */
export interface OrderRow {
  id: string;
  reference: string;
  created_at: string;
  updated_at: string;
  is_test: boolean;
  mode: "test" | "live";
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_address: string | null;
  customer_notes: string | null;
  product: string;
  size: string;
  stitch: string;
  material: string;
  color: string;
  tag_material: string;
  tag_text: string;
  configuration: ProductConfiguration;
  catalog_version: string;
  preview_version: string;
  price_jod: number | string;
  currency: string;
  price_type: "demonstration" | "variant";
  pricing_version: string;
  status: OrderRecord["status"];
  email_status: OrderRecord["emailStatus"];
  email_attempts: number;
  email_last_attempt_at: string | null;
  email_provider_id: string | null;
  email_error: string | null;
  idempotency_key: string;
  request_hash: string;
  access_token_hash?: string;
}

export function rowToOrder(r: OrderRow): OrderRecord {
  return {
    id: r.id,
    reference: r.reference,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isTest: r.is_test,
    mode: r.mode,
    customer: {
      name: r.customer_name,
      email: r.customer_email,
      phone: r.customer_phone,
      deliveryAddress: r.delivery_address,
      notes: r.customer_notes,
    },
    configuration: r.configuration,
    catalogVersion: r.catalog_version,
    previewVersion: r.preview_version,
    priceJod: Number(r.price_jod),
    currency: r.currency,
    priceType: r.price_type,
    pricingVersion: r.pricing_version,
    status: r.status,
    emailStatus: r.email_status,
    emailAttempts: r.email_attempts,
    emailLastAttemptAt: r.email_last_attempt_at,
    emailProviderId: r.email_provider_id,
    emailError: r.email_error,
    idempotencyKey: r.idempotency_key,
    requestHash: r.request_hash,
  };
}

export function newOrderToRow(o: NewOrder) {
  return {
    reference: o.reference,
    is_test: o.isTest,
    mode: o.mode,
    customer_name: o.customer.name,
    customer_email: o.customer.email,
    customer_phone: o.customer.phone ?? null,
    delivery_address: o.customer.deliveryAddress ?? null,
    customer_notes: o.customer.notes ?? null,
    product: o.configuration.product,
    size: o.configuration.size,
    stitch: o.configuration.stitch,
    material: o.configuration.material,
    color: o.configuration.color,
    tag_material: o.configuration.tagMaterial,
    tag_text: o.configuration.tagText,
    configuration: o.configuration,
    catalog_version: o.catalogVersion,
    preview_version: o.previewVersion,
    price_jod: o.priceJod,
    currency: o.currency,
    price_type: o.priceType,
    pricing_version: o.pricingVersion,
    idempotency_key: o.idempotencyKey,
    request_hash: o.requestHash,
    access_token_hash: o.accessTokenHash,
  };
}

/** Columns returned to server code (never the access token hash). */
export const ORDER_COLUMNS =
  "id,reference,created_at,updated_at,is_test,mode,customer_name,customer_email,customer_phone,delivery_address,customer_notes,product,size,stitch,material,color,tag_material,tag_text,configuration,catalog_version,preview_version,price_jod,currency,price_type,pricing_version,status,email_status,email_attempts,email_last_attempt_at,email_provider_id,email_error,idempotency_key,request_hash";
