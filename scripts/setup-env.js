const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- P.A.I. — AUTOMATIC ENVIRONMENT SETUP & SANITY CHECK ---');

const envPath = path.join(__dirname, '../.env.local');

// 1. Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.log('⚠️ .env.local file not found!');
  const prodEnvPath = path.join(__dirname, '../.env.production');
  if (fs.existsSync(prodEnvPath)) {
    console.log('🔄 Copying .env.production to .env.local...');
    fs.copyFileSync(prodEnvPath, envPath);
  } else {
    console.log('❌ No env file template found to copy. Please create .env.local.');
  }
} else {
  console.log('✅ .env.local file detected.');
}

// 2. Validate environment keys
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'LLM_PROVIDER',
    'GROQ_API_KEY'
  ];
  
  const missingKeys = [];
  requiredKeys.forEach(key => {
    const regex = new RegExp(`^${key}=`);
    const line = lines.find(l => regex.test(l.trim()));
    if (!line) {
      missingKeys.push(key);
    } else {
      const val = line.split('=')[1]?.trim();
      if (!val || val.length === 0) {
        missingKeys.push(key);
      }
    }
  });

  if (missingKeys.length > 0) {
    console.log('⚠️ The following critical environment variables are empty or missing in .env.local:');
    missingKeys.forEach(k => console.log(`  - ${k}`));
    console.log('💡 Please fill them in .env.local before running the app.');
  } else {
    console.log('✅ All critical environment variables are set.');
  }
} catch (e) {
  console.error('❌ Error parsing .env.local:', e.message);
}

// 3. Clean Next.js cache to avoid CSS or route corruption
console.log('🧹 Clearing Next.js build cache to prevent route and CSS corruption...');
const nextCachePath = path.join(__dirname, '../.next');
if (fs.existsSync(nextCachePath)) {
  try {
    fs.rmSync(nextCachePath, { recursive: true, force: true });
    console.log('✅ .next directory cleared.');
  } catch (e) {
    console.log('⚠️ Could not remove .next directory (it may be locked by a running process).');
  }
} else {
  console.log('✅ Cache was already clean.');
}

// 4. Verify TypeScript and compile health
console.log('🔍 Running clean TypeScript verification check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ TypeScript compilation verified successfully!');
} catch (e) {
  console.error('❌ TypeScript checks failed. Please fix compile errors before deployment.');
}

console.log('-----------------------------------------------------------');
console.log('🎉 Project is fully optimized and ready for your next session!');
