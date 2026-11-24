import { PRODUCTION_ESTIMATE_TEXT } from "@/config/catalog";
import { TEST_NOTICE } from "@/config/site";
import { describeConfiguration } from "../configuration";
import { escapeHtml } from "../escapeHtml";
import { formatJod } from "../pricing";
import type { OrderRecord } from "../orders";
import { textDirection } from "../tagText";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Order acknowledgment email ("order request received").
 * Every customer-supplied value is HTML-escaped.
 */
export function buildAcknowledgmentEmail(order: OrderRecord, orderLink?: string): EmailContent {
  const d = describeConfiguration(order.configuration);
  const test = order.isTest;
  const subject = `${test ? "[TEST ORDER] " : ""}KhiyootLoop order request received – ${order.reference}`;
  const priceLine = `${formatJod(order.priceJod)}${
    order.priceType === "demonstration" ? " (classroom test price, not a final price)" : ""
  }`;
  const rows: [string, string][] = [
    ["Order reference", order.reference],
    ["Product", d.productName],
    ["Size", d.sizeLabel],
    ["Stitch", d.stitchLabel],
    ["Material", d.materialLabel + (d.containsWool ? " (contains wool)" : "")],
    ["Colour", d.colorLabel],
    ["Tag", d.tagMaterialLabel],
    ["Tag text (exact)", d.tagText],
    ["Price", priceLine],
  ];
  const nextStep = test
    ? "This was a classroom test order. Nothing will be made or charged."
    : "We will check materials, tag engraving, capacity and payment arrangements, then contact you to confirm production. Your order is not confirmed for production until then.";

  const textLines = [
    test ? `${TEST_NOTICE.toUpperCase()}` : "",
    `Hello ${order.customer.name},`,
    "",
    "We have received your order request. This email confirms receipt only; production has not been confirmed.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    PRODUCTION_ESTIMATE_TEXT,
    "",
    `Next step: ${nextStep}`,
    orderLink ? `\nView your order request: ${orderLink}` : "",
    "",
    "The preview on the website is an illustration. Handmade texture and screen colours vary.",
    "",
    "KhiyootLoop — handmade crochet, Jordan",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === ""));

  const tagDir = textDirection(d.tagText);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#fbf7ef;color:#232323;font-family:Arial,Helvetica,'Noto Sans Arabic',Tahoma,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
${
  test
    ? `<p style="background:#fde9f2;border:2px solid #a3155f;color:#5b0c33;padding:12px;border-radius:8px;font-weight:bold;margin:0 0 16px;">${escapeHtml(TEST_NOTICE)}</p>`
    : ""
}
<h1 style="font-size:22px;color:#0e5e63;margin:0 0 8px;">Order request received</h1>
<p>Hello ${escapeHtml(order.customer.name)},</p>
<p>We have received your order request. <strong>This email confirms receipt only; production has not been confirmed.</strong></p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:15px;">
${rows
  .map(
    ([k, v]) =>
      `<tr><th scope="row" style="text-align:left;padding:6px 8px;border-bottom:1px solid #e6dccb;width:40%;">${escapeHtml(k)}</th><td style="padding:6px 8px;border-bottom:1px solid #e6dccb;"${
        k.startsWith("Tag text") ? ` dir="${tagDir}"` : ""
      }>${escapeHtml(v)}</td></tr>`,
  )
  .join("\n")}
</table>
<p>${escapeHtml(PRODUCTION_ESTIMATE_TEXT)}</p>
<p><strong>Next step:</strong> ${escapeHtml(nextStep)}</p>
${orderLink ? `<p><a href="${escapeHtml(orderLink)}" style="color:#0e5e63;">View your order request</a></p>` : ""}
<p style="font-size:13px;color:#555;">The preview on the website is an illustration. Handmade texture and screen colours vary.</p>
<p style="font-size:13px;color:#555;">KhiyootLoop — handmade crochet, Jordan</p>
</div></body></html>`;

  return { subject, html, text: textLines.join("\n") };
}
