const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const TEMP_FOLDERS = [
  process.env.TEMP,
  path.join(process.env.WINDIR, 'Temp')
];

const TASK_NAME = "TempCleanupTask_NodeJS";

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function getFolderSize(folder) {
  let totalSize = 0;
  async function walk(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          await walk(fullPath);
        } else if (file.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          } catch {}
        }
      }
    } catch {}
  }
  await walk(folder);
  return totalSize;
}

function bytesToReadable(size) {
  const units = ['B','KB','MB','GB','TB'];
  let i = 0;
  while(size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return size.toFixed(2) + units[i];
}

async function cleanTempFolder(folder) {
  try {
    const items = await fs.readdir(folder, { withFileTypes: true });
    let deletedFiles = 0, deletedFolders = 0, skippedItems = 0;
    const beforeSize = await getFolderSize(folder);

    for (const item of items) {
      const fullPath = path.join(folder, item.name);
      try {
        if (item.isFile()) {
          await fs.unlink(fullPath);
          deletedFiles++;
        } else if (item.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
          deletedFolders++;
        }
      } catch {
        skippedItems++;
      }
    }
    const afterSize = await getFolderSize(folder);
    const freed = beforeSize - afterSize;

    console.log(`\nSummary for ${folder}:`);
    console.log(`Deleted files: ${deletedFiles}`);
    console.log(`Deleted folders: ${deletedFolders}`);
    console.log(`Skipped locked or inaccessible: ${skippedItems}`);
    console.log(`Freed space: ${bytesToReadable(freed)}`);
  } catch {
    console.log(`Cannot access folder: ${folder}`);
  }
}

async function runCleanup() {
  console.log("Starting temp files cleanup...");
  for (const folder of TEMP_FOLDERS) {
    if (folder) {
      await cleanTempFolder(folder);
    }
  }
  console.log("\nCleanup done.");
}

function createScheduledTask(scriptPath, frequency, interval) {
  return new Promise((resolve, reject) => {
    const freqMap = {
      hourly: 'HOURLY',
      daily: 'DAILY',
      weekly: 'WEEKLY',
      monthly: 'MONTHLY'
    };
    const schedule = freqMap[frequency];
    if (!schedule) {
      reject(new Error("Invalid frequency"));
      return;
    }

    let timeParam;
    if (frequency === 'weekly') {
      timeParam = `/MO ${interval} /D MON`;
    } else if (frequency === 'monthly') {
      timeParam = `/MO ${interval} /D 1`;
    } else {
      timeParam = `/MO ${interval}`;
    }

    // Windows paths with spaces need quotes escaped for schtasks
    const nodeExe = process.execPath;
    const trCommand = `"${nodeExe}" "${scriptPath}"`;
    // Escape inner quotes for schtasks command
    const trCommandEscaped = `"${trCommand.replace(/"/g, '\\"')}"`;

    const cmd = `schtasks /Create /F /SC ${schedule} ${timeParam} /TN ${TASK_NAME} /TR ${trCommandEscaped} /RL HIGHEST`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function main() {
  // If passed --cleanup argument, just run cleanup and exit
  if (process.argv.includes('--cleanup')) {
    await runCleanup();
    return;
  }

  console.log("This script schedules automatic cleanup of your Windows temp folders.");
  console.log("You need to run this script once as Administrator to create the scheduled task.");
  console.log("After setup, cleanup will run automatically on schedule.\n");

  const proceed = await askQuestion("Do you want to set up scheduling now? (y/n): ");
  if (proceed.toLowerCase() !== 'y') {
    console.log("Exiting without scheduling.");
    return;
  }

  console.log("Choose scheduling frequency:");
  console.log("1. Hourly");
  console.log("2. Daily");
  console.log("3. Weekly");
  console.log("4. Monthly");

  const choice = await askQuestion("Enter choice number: ");
  const freqMap = { '1': 'hourly', '2': 'daily', '3': 'weekly', '4': 'monthly' };
  const frequency = freqMap[choice];
  if (!frequency) {
    console.log("Invalid choice");
    return;
  }

  const intervalInput = await askQuestion(`Enter interval (every how many ${frequency}s?): `);
  const interval = parseInt(intervalInput, 10);
  if (isNaN(interval) || interval < 1) {
    console.log("Invalid interval");
    return;
  }

  const scriptPath = path.resolve(process.argv[1]);

  try {
    const output = await createScheduledTask(scriptPath, frequency, interval);
    console.log("Scheduled task created successfully:");
    console.log(output);
    console.log("\nYou can manually run cleanup anytime with:\n  node yourscript.js --cleanup");
  } catch (err) {
    console.error("Failed to create scheduled task:", err.message || err);
    console.error("Make sure to run this script as Administrator.");
  }
}

main();
