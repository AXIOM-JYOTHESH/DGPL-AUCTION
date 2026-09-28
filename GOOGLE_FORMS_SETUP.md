# 🏏 Google Forms to Auction App - Real-Time Automated Registration Setup

This guide walks you through setting up automated player registrations using **Google Forms**, **Google Sheets**, and the **Auction App Real-Time Webhook**.

---

## 📋 Overview of the Flow

```
[ Participant submits Google Form (Name, Year, Photo max 5MB) ]
                          │
                          ▼
[ Response saved in Google Sheet & Photo saved in Google Drive ]
                          │
                          ▼ (Google Apps Script: onFormSubmit Trigger)
[ Automatic Webhook: POST /api/v1/players/webhook/register ]
                          │
                          ▼
[ Player created with status 'pending' (NOT in public pool yet) ]
                          │
                          ▼ (Real-time Socket.IO Alert)
[ 🔔 Live Notification in Admin Portal -> "Player Registrations & Approvals" ]
                          │
                          ▼ (Admin Review: Upper Hand to Modify Role, Year, Price)
[ Admin clicks "Accept Player" ➔ Moves to 'unsold' ➔ Enters Live Auction Pool! 🚀 ]
```

---

## Step 1: Create your Google Form

1. Go to [Google Forms](https://forms.google.com) and click **Blank form**.
2. Add the following questions:
   - **Full Name** (Short answer, Required)
   - **Academic Year** (Multiple choice or Dropdown):
     - `1st Year`
     - `2nd Year`
     - `3rd Year`
     - `4th Year`
   - **Playing Role / Category** (Multiple choice):
     - `Batsman`
     - `Bowler`
     - `All-Rounder`
     - `Wicket-Keeper`
   - **Upload Photo** (File upload, Required):
     - Allow only specific file types: Select **Image**
     - Maximum number of files: **1**
     - Maximum file size: **10 MB** (or 5 MB)

---

## Step 2: Link Google Form to a Google Sheet

1. In your Google Form, click on the **Responses** tab at the top.
2. Click **Link to Sheets** (the green spreadsheet icon).
3. Select **Create a new spreadsheet** (e.g. `DGPL 2026 Player Registrations`) and click **Create**.
4. The Google Sheet will open automatically with column headers:
   `Timestamp | Full Name | Academic Year | Playing Role | Upload Photo`

---

## Step 3: Set Google Drive Folder Permissions (Crucial for Photos)

When participants upload photos through Google Forms, Google saves them to a folder in your Google Drive named `[Form Name] (File Responses)`.

1. Go to your [Google Drive](https://drive.google.com).
2. Locate the folder created for the form uploads (inside the same folder where your form was created).
3. Right-click the folder and select **Share** > **Share**.
4. Under **General access**, change from **Restricted** to **Anyone with the link**.
5. Ensure the role is set to **Viewer**.
6. Click **Done**.

> **Note:** Our Google Apps Script also automatically sets each uploaded file to public viewer access whenever a form is submitted!

---

## Step 4: Add the Google Apps Script to the Sheet

1. In your linked Google Sheet, click **Extensions** > **Apps Script** in the top navigation bar.
2. Delete any default code in the editor (`function myFunction() { ... }`).
3. Open the file [`GOOGLE_SHEET_APPS_SCRIPT.js`](file:///Users/vivekchowdarypathuri/Downloads/PROALL/AUCTION_PRO/GOOGLE_SHEET_APPS_SCRIPT.js) in this project.
4. Copy the entire contents of [`GOOGLE_SHEET_APPS_SCRIPT.js`](file:///Users/vivekchowdarypathuri/Downloads/PROALL/AUCTION_PRO/GOOGLE_SHEET_APPS_SCRIPT.js) and paste it into the Apps Script editor.
5. Update the `WEBHOOK_URL` constant near the top:
   - **For Local Testing:** Use an ngrok or Cloudflare tunnel URL (e.g. `https://your-tunnel.ngrok-free.app/api/v1/players/webhook/register`).
   - **For Production:** Set it to your live backend domain:
     ```javascript
     const WEBHOOK_URL = 'https://dgpl-auction.tech/api/v1/players/webhook/register';
     ```
6. Click the **Save** icon (floppy disk) or press `Ctrl + S` / `Cmd + S`.

---

## Step 5: Configure the Automated `onFormSubmit` Trigger

To make the script run instantly the second someone registers:

1. In the Apps Script left sidebar, click the **Triggers** icon (the alarm clock icon ⏰).
2. Click **+ Add Trigger** in the bottom-right corner.
3. Configure the trigger settings:
   - **Choose which function to run:** `onFormSubmit`
   - **Choose which deployment should run:** `Head`
   - **Select event source:** `From spreadsheet`
   - **Select event type:** `On form submit`
   - **Failure notification settings:** `Notify me immediately`
4. Click **Save**.
5. Google will prompt you to authorize permissions (Drive and UrlFetch). Click **Advanced** > **Go to Untitled project (unsafe)** > **Allow**.

---

## Step 6: Test the Integration

### Method A: Using the Sheet Menu
1. Refresh your Google Sheet.
2. A new menu item called **🏏 DGPL Auction** will appear in the top bar.
3. Click **🏏 DGPL Auction** > **🔍 Test Webhook Connection**.
   - You should see: `Status: 200` with confirmation that the webhook is live!
4. If you already have responses in the sheet, click **⚡ Sync All Responses Now** to import all existing players at once.

### Method B: Submit a Real Test Response
1. Open your Google Form link in an incognito window.
2. Fill in:
   - Name: `Test Player`
   - Year: `3rd Year`
   - Role: `All-Rounder`
   - Photo: Upload any sample image (< 5MB)
3. Hit **Submit**.
4. Check your Google Sheet: A new column **`Auction Sync Status`** will update to `Received ⏳ Pending Review`.
5. Check the Admin Portal: 
   - A live toast alert `🔔 New Registration: Test Player (All-Rounder, Year 3) submitted!` will appear.
   - The **📝 Player Registrations & Approvals** tab will show a red badge `1 New`.
   - Click the tab: You'll see their card under **3rd Year** with their photo, year, role pills, and base price.
6. Admin Upper Hand:
   - Click any role pill (e.g. change from `All-Rounder` to `Batsman`) or adjust base price.
   - Click **✅ Accept Player** ➔ Player is approved!
   - Now the player enters the **Available Players** pool and is ready for the live auction block!

---

## 🛠️ Features Included in this Integration

- **Admin Upper Hand & Verification:** Players can never enter the live auction pool until the Admin reviews and accepts them. Admin can modify their sportsmanship (role), academic year, or base price before accepting.
- **Year-by-Year Organization:** Admin portal organizes pending entries individually by academic year (1st, 2nd, 3rd, 4th Year) with real-time badge counts.
- **Automatic Photo CDN Conversion:** Google Drive links are automatically converted to high-speed direct Google CDN URLs (`https://lh3.googleusercontent.com/d/{id}`) so they display smoothly in browser `<img>` tags.
- **Duplicate Prevention / Self-Correction:** If a player submits the form again (e.g., to update their photo), their profile is updated rather than creating a duplicate player.
- **Real-Time Live Alerts:** Emits instant Socket.IO notifications so the admin console receives registrations without needing a manual browser refresh.
