# Windows Temp Cleaner

A Node.js utility script to automatically clean Windows temporary folders (`%TEMP%` and `C:\Windows\Temp`) by deleting unused files and folders.

## Features

- Deletes temp files and folders safely, skipping locked or in-use files  
- Shows summary of deleted files, folders, and freed disk space  
- Interactive scheduling to run cleanup automatically using Windows Task Scheduler  
- Supports hourly, daily, weekly, and monthly cleanup intervals  
- Allows manual cleanup via command line argument  
- Requires Windows OS and Node.js  

---

## Requirements

- Windows operating system  
- Node.js installed ([Download Node.js](https://nodejs.org/))  
- Run scheduling commands as Administrator (important for creating scheduled tasks)  

---

## Installation

1. Clone or download this repository  
2. Open Command Prompt as Administrator  
3. Navigate to the project folder  
4. Run the script using Node.js  

---

## Usage

### Scheduling automatic cleanup

Run the script and follow prompts to schedule automatic cleanup:
**node clean_temp_scheduled.js**

To clean temp folders immediately without scheduling, run:
**node clean_temp_scheduled.js --cleanup**

