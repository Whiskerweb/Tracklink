#!/usr/bin/env tsx
/**
 * Script pour supprimer les restrictions réseau via l'API Supabase Management
 */

const dotenv = require("dotenv");
dotenv.config({ path: require("path").resolve(process.cwd(), ".env") });

async function removeRestrictions() {
  console.log("🔧 Attempting to remove network restrictions...\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found");
    console.error("   Cannot access Management API without service role key");
    return false;
  }

  // Extract project ref from SUPABASE_URL
  const projectRef = process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error("❌ Could not extract project ref from SUPABASE_URL");
    return false;
  }

  console.log(`📋 Project ref: ${projectRef}`);

  // Try to use Management API to remove restrictions
  // Note: This requires the Management API which may not be available via standard MCP tools
  try {
    const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/network-restrictions`;
    
    console.log("🔍 Checking current restrictions...");
    
    // First, get current restrictions
    const getResponse = await fetch(managementApiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (getResponse.ok) {
      const restrictions = await getResponse.json();
      console.log(`📊 Current restrictions: ${JSON.stringify(restrictions, null, 2)}`);
      
      // Try to remove all restrictions
      console.log("\n🗑️  Attempting to remove all restrictions...");
      const deleteResponse = await fetch(managementApiUrl, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (deleteResponse.ok) {
        console.log("✅ Restrictions removed successfully!");
        return true;
      } else {
        const error = await deleteResponse.text();
        console.error(`❌ Failed to remove restrictions: ${deleteResponse.status}`);
        console.error(`   Error: ${error}`);
      }
    } else {
      console.error(`❌ Failed to get restrictions: ${getResponse.status}`);
      const error = await getResponse.text();
      console.error(`   Error: ${error}`);
    }
  } catch (error: any) {
    console.error("❌ Error accessing Management API:", error.message);
    console.error("\n💡 Note: Network restrictions must be managed via Supabase Dashboard");
    console.error("   or Supabase Management API (requires API key with proper permissions)");
  }

  return false;
}

removeRestrictions().then((success) => {
  if (success) {
    console.log("\n⏳ Waiting 10 seconds for propagation...");
    setTimeout(() => {
      console.log("✅ Ready to test connection");
    }, 10000);
  }
});

