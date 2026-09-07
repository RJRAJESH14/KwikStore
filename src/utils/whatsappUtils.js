/**
 * WhatsApp Formatting & Invoice Sharing Utilities for KwikStore Pro
 */

export function generateWhatsAppInvoiceText(invoice, shop, customer) {
  if (!invoice) return '';

  const shopName = invoice.shop_name || shop?.name || 'KwikStore';
  const shopPhone = invoice.shop_phone || shop?.phone || '';
  const shopAddress = [invoice.shop_address || shop?.address, invoice.shop_city || shop?.city].filter(Boolean).join(', ');
  const shopUpi = invoice.shop_upi_id || shop?.upi_id || '';
  const shopGstin = invoice.shop_gstin || shop?.gstin || '';
  
  const custName = invoice.customer_name || customer?.name || 'Valued Customer';
  const invNo = invoice.invoice_number;
  const invDate = invoice.invoice_date 
    ? String(invoice.invoice_date).slice(0, 16) 
    : new Date().toLocaleDateString('en-IN');
    
  const grandTotal = Number(invoice.grand_total || 0).toFixed(2);
  const paid = Number(invoice.amount_paid ?? invoice.paid_amount ?? 0).toFixed(2);
  const balance = Number(invoice.balance_due ?? 0).toFixed(2);
  const status = invoice.payment_status || (Number(balance) <= 0 ? 'PAID' : 'CREDIT');
  const mode = invoice.payment_mode || 'CASH';

  let itemsList = '';
  if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
    itemsList = '\n*ITEMS ORDERED:*\n' + invoice.items.map((it, idx) => {
      const name = it.name || it.item_name || 'Item';
      const qty = it.quantity || 1;
      const unit = it.unit || 'PCS';
      const total = Number(it.total_amount || (qty * (it.unit_price || 0))).toFixed(2);
      return `${idx + 1}. *${name}* (${qty} ${unit}) — ₹${total}`;
    }).join('\n') + '\n';
  }

  let text = `🧾 *TAX INVOICE — ${shopName.toUpperCase()}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*Bill No:* ${invNo}\n`;
  text += `*Date:* ${invDate}\n`;
  text += `*Customer:* ${custName}\n`;
  if (invoice.customer_gstin || customer?.gstin) {
    text += `*GSTIN:* ${invoice.customer_gstin || customer.gstin}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (itemsList) {
    text += `${itemsList}`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  }
  
  if (invoice.sub_total && Number(invoice.sub_total) !== Number(grandTotal)) {
    text += `*Sub Total:* ₹${Number(invoice.sub_total).toFixed(2)}\n`;
  }
  if (invoice.discount_amount && Number(invoice.discount_amount) > 0) {
    text += `*Discount:* -₹${Number(invoice.discount_amount).toFixed(2)}\n`;
  }
  if (invoice.tax_amount && Number(invoice.tax_amount) > 0) {
    text += `*GST Tax:* ₹${Number(invoice.tax_amount).toFixed(2)}\n`;
  }
  text += `*Grand Total:* ₹${grandTotal}\n`;
  text += `*Amount Paid:* ₹${paid} (${mode})\n`;
  text += `*Balance Due:* ₹${balance}\n`;
  text += `*Payment Status:* ${status === 'PAID' ? '✅ PAID' : (status === 'CREDIT' ? '🔴 CREDIT (UDHAR)' : '🟡 ' + status)}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (shopAddress || shopPhone || shopGstin) {
    text += `🏪 *${shopName}*`;
    if (shopGstin) text += `\n*GSTIN:* ${shopGstin}`;
    if (shopAddress) text += `\n📍 ${shopAddress}`;
    if (shopPhone) text += `\n📞 ${shopPhone}`;
    text += `\n`;
  }
  
  if (shopUpi && Number(balance) > 0) {
    text += `💳 *Pay Pending Due via UPI:* ${shopUpi}\n`;
  }
  
  text += `\n🙏 *Thank you for choosing ${shopName}!*`;

  return text;
}

export function openWhatsAppInvoice(invoice, shop, customer) {
  const text = generateWhatsAppInvoiceText(invoice, shop, customer);
  const phone = (invoice?.customer_phone || customer?.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone = phone.length >= 10 ? `91${phone.slice(-10)}` : '';
  const url = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` 
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
