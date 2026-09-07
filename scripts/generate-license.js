#!/usr/bin/env node

/**
 * ============================================================================
 * 🔐 KwikStore Pro - Developer Master License Key Generator
 * Author / Developer: Rajesh Sharma (FleetBill Pro / KwikStore Pro)
 * Use this tool to generate cryptographic, hardware-locked license keys for clients.
 * ============================================================================
 */

import readline from 'readline';
import { generateLicenseKey } from '../server/services/licenseService.js';

// Parse command line arguments if provided: e.g. --machine=... --customer=... --plan=...
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    acc[k.toLowerCase()] = v;
  }
  return acc;
}, {});

async function main() {
  console.log('\n================================================================');
  console.log('🛡️  KWIKSTORE PRO - DEVELOPER MASTER LICENSE GENERATOR');
  console.log('================================================================\n');

  if (args.machine) {
    // Non-interactive generation via CLI args
    try {
      const result = generateLicenseKey({
        machineId: args.machine,
        customerName: args.customer || 'KwikStore Client',
        planType: (args.plan || '1YEAR').toUpperCase(),
        customDays: args.days ? parseInt(args.days, 10) : undefined
      });
      displayResult(result);
      process.exit(0);
    } catch (e) {
      console.error('❌ Error generating key:', e.message);
      process.exit(1);
    }
  }

  // Interactive CLI wizard
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    const machineIdInput = await question('📋 Enter Client Machine ID (e.g. KWIK-8A9F-7B2C-9E41): ');
    if (!machineIdInput.trim()) {
      console.log('❌ Machine ID is required!');
      rl.close();
      return;
    }

    const customerInput = await question('🏪 Enter Customer / Shop Name (e.g. Pujarani Garments): ');
    const customerName = customerInput.trim() || 'Valued Store Owner';

    console.log('\nSelect License Plan Duration:');
    console.log('  1) 1-Year Professional License (Default - 365 Days)');
    console.log('  2) Lifetime Unlimited License (Permanent)');
    console.log('  3) 6-Month Standard License (180 Days)');
    console.log('  4) 1-Month Trial/Monthly Plan (30 Days)');
    console.log('  5) 2-Year Enterprise License (730 Days)');
    console.log('  6) 14-Day Extended Trial');

    const planChoice = await question('\nEnter Plan Number [1-6] (Default: 1): ');

    let planType = '1YEAR';
    switch (planChoice.trim()) {
      case '2': planType = 'LIFETIME'; break;
      case '3': planType = '6MONTHS'; break;
      case '4': planType = '1MONTH'; break;
      case '5': planType = '2YEAR'; break;
      case '6': planType = 'TRIAL'; break;
      default: planType = '1YEAR'; break;
    }

    const result = generateLicenseKey({
      machineId: machineIdInput.trim(),
      customerName,
      planType
    });

    displayResult(result);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    rl.close();
  }
}

function displayResult(result) {
  console.log('\n----------------------------------------------------------------');
  console.log('✨ LICENSE KEY GENERATED SUCCESSFULLY!');
  console.log('----------------------------------------------------------------');
  console.log(`🔑 License Key   : \x1b[32m\x1b[1m${result.licenseKey}\x1b[0m`);
  console.log(`🖥️  Locked To PC  : ${result.machineId}`);
  console.log(`🏪 Customer Name : ${result.customerName}`);
  console.log(`📦 Plan Tier     : ${result.planType}`);
  console.log(`⏳ Validity      : ${result.daysValid} Days (Expires: ${new Date(result.expiresAt).toLocaleDateString('en-IN')})`);
  console.log('----------------------------------------------------------------');
  console.log('\n📩 WhatsApp/SMS Template to send to buyer:\n');
  console.log(`----------------------------------------------------------------`);
  console.log(`Hello ${result.customerName},\nHere is your official activation license for KwikStore Pro:\n\n🔑 License Key: ${result.licenseKey}\n🏪 Registered Name: ${result.customerName}\n⏳ Plan: ${result.planType} (${result.daysValid} Days)\n\nThank you for choosing KwikStore Pro! (fleetbillpro.com)`);
  console.log('----------------------------------------------------------------\n');
}

main();
