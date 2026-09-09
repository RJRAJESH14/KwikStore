import { getDb } from '../database/db.js';

// Get WhatsApp Cloud API Configuration
export function getWhatsAppConfig() {
  const db = getDb();
  try {
    const row = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'whatsapp_%'").all();
    const config = {};
    for (const item of row) {
      config[item.key.replace('whatsapp_', '')] = item.value;
    }
    return {
      isEnabled: config.enabled === 'true',
      phoneNumberId: config.phone_number_id || '',
      accessToken: config.access_token || '',
      businessAccountId: config.business_account_id || '',
      senderNumber: config.sender_number || '',
      defaultCountryCode: config.country_code || '91'
    };
  } catch (err) {
    return {
      isEnabled: false,
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      senderNumber: '',
      defaultCountryCode: '91'
    };
  }
}

// Save WhatsApp Cloud API Configuration
export function saveWhatsAppConfig(configData) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction(() => {
    upsert.run('whatsapp_enabled', String(Boolean(configData.isEnabled)));
    if (configData.phoneNumberId !== undefined) upsert.run('whatsapp_phone_number_id', configData.phoneNumberId);
    if (configData.accessToken !== undefined) upsert.run('whatsapp_access_token', configData.accessToken);
    if (configData.businessAccountId !== undefined) upsert.run('whatsapp_business_account_id', configData.businessAccountId);
    if (configData.senderNumber !== undefined) upsert.run('whatsapp_sender_number', configData.senderNumber);
    if (configData.defaultCountryCode !== undefined) upsert.run('whatsapp_country_code', configData.defaultCountryCode);
  });

  tx();
  return { success: true, message: 'WhatsApp Cloud API settings saved successfully.' };
}

// Format invoice message text
export function formatInvoiceWhatsAppText(invoice, shop) {
  const cleanPhone = shop.phone || '+91 8338833377';
  const total = Number(invoice.total_amount || 0).toFixed(2);
  const itemsSummary = (invoice.items || [])
    .slice(0, 5)
    .map((item) => `• ${item.item_name || item.name} (x${item.quantity}) - ₹${Number(item.total || (item.quantity * item.unit_price)).toFixed(2)}`)
    .join('\n');
  const remainingCount = (invoice.items || []).length > 5 ? `\n...and ${(invoice.items || []).length - 5} more items` : '';

  return (
`🧾 *TAX INVOICE / BILL RECEIPT*
━━━━━━━━━━━━━━━━━━━━
🏬 *${shop.name || 'KwikStore Pro'}*
📍 ${shop.address || ''}, ${shop.city || ''}
📞 Helpline: ${cleanPhone}
━━━━━━━━━━━━━━━━━━━━
📄 *Bill No:* #${invoice.invoice_number}
📅 *Date:* ${new Date().toLocaleDateString('en-GB')}
👤 *Customer:* ${invoice.customer_name || 'Valued Customer'}
━━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS SUMMARY:*
${itemsSummary}${remainingCount}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL BILL AMOUNT:* *₹${total}*
💳 *Payment Mode:* ${invoice.payment_mode || 'Cash'}
${Number(invoice.discount_amount || 0) > 0 ? `🎉 *Total Savings:* ₹${Number(invoice.discount_amount).toFixed(2)}\n` : ''}
${shop.upi_id ? `📱 *UPI ID:* ${shop.upi_id}\n` : ''}
━━━━━━━━━━━━━━━━━━━━
${shop.thermal_footer_note || 'Thank you for shopping with us! Please visit again.'}`
  );
}

// Send WhatsApp Direct Cloud API Message via Meta Graph API
export async function sendDirectWhatsAppMessage({ toPhone, messageText, mediaUrl = null }) {
  const config = getWhatsAppConfig();

  // Clean and format recipient phone number
  let cleanNumber = String(toPhone || '').replace(/[^0-9]/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = (config.defaultCountryCode || '91') + cleanNumber;
  }

  // If Meta API credentials are not provided, return web fallback link
  if (!config.phoneNumberId || !config.accessToken) {
    const encodedText = encodeURIComponent(messageText);
    const webUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;
    return {
      success: true,
      mode: 'WEB_FALLBACK',
      webUrl,
      message: 'Direct WhatsApp Cloud API credentials not configured. Generated 1-Click WhatsApp link.'
    };
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'text',
      text: { body: messageText }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      return {
        success: true,
        mode: 'DIRECT_CLOUD_API',
        messageId: data.messages?.[0]?.id,
        message: `Invoice sent directly to WhatsApp (+${cleanNumber}) successfully!`
      };
    } else {
      return {
        success: false,
        error: data.error?.message || 'Meta WhatsApp API Error',
        details: data
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}
