# Epidemics 10 Tournament - Setup Guide

## Overview

The Epidemics 10 Tournament is a multi-participant forecasting competition built into RespiLens. Participants compete by making predictions for 5 different epidemic forecasting challenges, and their accuracy is tracked on a live leaderboard.

## Architecture

- **Frontend**: React components in `/app/src/components/tournament/`
- **Backend**: Google Apps Script (serverless)
- **Database**: Google Sheets
- **Storage**: LocalStorage for participant session, Google Sheets for submissions
- **Scoring**: Weighted Interval Score (WIS) - same as Forecastle

## Quick Start

1. **Set up Google Sheets** (see structure below)
2. **Deploy Google Apps Script** (see Apps Script code below)
3. **Configure API URL** in `/app/.env`
4. **Navigate to** `/tournament` in the app

---

## Google Sheets Structure

Your sheet should have the following tabs:

### 1. **Participants** (Sheet 1)
```
participant_id | first_name | last_name | joined_at
---------------|------------|-----------|-------------------
uuid-1         | Alice      | Smith     | 2025-11-18 10:00
uuid-2         | Bob        | Jones     | 2025-11-18 10:15
```

### 2. **Submissions** (Sheet 2)
```
submission_id | participant_id | challenge_num | median | q25  | q75  | q025 | q975 | submitted_at
-------------|----------------|---------------|--------|------|------|------|------|-------------------
sub-1        | uuid-1         | 1             | 1500   | 1200 | 1800 | 900  | 2100 | 2025-11-18 10:30
sub-2        | uuid-1         | 2             | 2300   | 2000 | 2600 | 1800 | 2900 | 2025-11-18 11:00
```

### 3. **Scores** (Sheet 3)
```
submission_id | challenge_num | wis   | dispersion | underprediction | overprediction | rank | ground_truth
-------------|---------------|-------|------------|-----------------|----------------|------|-------------
sub-1        | 1             | 125.5 | 80.0       | 30.0            | 15.5           | 1    | 1450
```

### 4. **Leaderboard** (Sheet 4 - Calculated)
```
participant_id | first_name | last_name | total_wis | avg_wis | completed | rank
---------------|------------|-----------|-----------|---------|-----------|------
uuid-1         | Alice      | Smith     | 450.2     | 90.0    | 5         | 1
uuid-2         | Bob        | Jones     | 512.8     | 102.6   | 5         | 2
```

**Leaderboard Formula** (in Sheet 4, auto-calculated):
```
=QUERY(
  {Participants!A:C,
   ARRAYFORMULA(SUMIF(Scores!A:A, Submissions!A:A, Scores!C:C)),
   ARRAYFORMULA(AVERAGEIF(Scores!A:A, Submissions!A:A, Scores!C:C)),
   ARRAYFORMULA(COUNTIF(Submissions!B:B, Participants!A:A))},
  "SELECT * WHERE Col6 = 5 ORDER BY Col5 ASC",
  1
)
```

---

## Google Apps Script Backend

### Setup Instructions:

1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Delete the default code
4. Paste the code below
5. Click **Deploy > New Deployment**
6. Select **Web App**
7. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy** and copy the Web App URL

### Apps Script Code:

```javascript
// Paste this in Google Apps Script Editor

const SHEET_ID = '17J5KWUrVuqmqqBcVJg2A-dfVdrL4LjXTvlztCDpS0g0';

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const action = e.parameter.action;

  let result;
  if (action === 'getLeaderboard') {
    result = getLeaderboard(ss);
  } else if (action === 'getParticipant') {
    result = getParticipant(ss, e.parameter.participantId);
  } else {
    result = {error: 'Invalid action'};
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  let result;
  if (action === 'register') {
    result = registerParticipant(ss, data);
  } else if (action === 'submitForecast') {
    result = submitForecast(ss, data);
  } else {
    result = {error: 'Invalid action'};
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function registerParticipant(ss, data) {
  const sheet = ss.getSheetByName('Participants');
  const participantId = Utilities.getUuid();
  const timestamp = new Date().toISOString();

  // Check if name already exists
  const existingData = sheet.getDataRange().getValues();
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][1] === data.firstName && existingData[i][2] === data.lastName) {
      return {
        success: true,
        participantId: existingData[i][0],
        message: 'Welcome back!'
      };
    }
  }

  // Add new participant
  sheet.appendRow([participantId, data.firstName, data.lastName, timestamp]);

  return {
    success: true,
    participantId: participantId,
    message: 'Registration successful!'
  };
}

function submitForecast(ss, data) {
  const submissionsSheet = ss.getSheetByName('Submissions');
  const submissionId = Utilities.getUuid();
  const timestamp = new Date().toISOString();

  // Check if already submitted for this challenge
  const existingData = submissionsSheet.getDataRange().getValues();
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][1] === data.participantId && existingData[i][2] === data.challengeNum) {
      // Update existing submission
      submissionsSheet.getRange(i + 1, 1, 1, 9).setValues([[
        existingData[i][0], // Keep same submission ID
        data.participantId,
        data.challengeNum,
        data.median,
        data.q25,
        data.q75,
        data.q025,
        data.q975,
        timestamp
      ]]);

      return {
        success: true,
        submissionId: existingData[i][0],
        message: 'Forecast updated!'
      };
    }
  }

  // Add new submission
  submissionsSheet.appendRow([
    submissionId,
    data.participantId,
    data.challengeNum,
    data.median,
    data.q25,
    data.q75,
    data.q025,
    data.q975,
    timestamp
  ]);

  return {
    success: true,
    submissionId: submissionId,
    message: 'Forecast submitted!'
  };
}

function getLeaderboard(ss) {
  const participantsSheet = ss.getSheetByName('Participants');
  const submissionsSheet = ss.getSheetByName('Submissions');

  // Get all participants
  const participantData = participantsSheet.getDataRange().getValues();
  const participants = [];

  for (let i = 1; i < participantData.length; i++) {
    participants.push({
      participantId: participantData[i][0],
      firstName: participantData[i][1],
      lastName: participantData[i][2]
    });
  }

  // Get all submissions
  const submissionData = submissionsSheet.getDataRange().getValues();

  // Calculate stats for each participant
  const leaderboard = participants.map(participant => {
    // Count completed challenges
    const userSubmissions = [];
    for (let i = 1; i < submissionData.length; i++) {
      if (submissionData[i][1] === participant.participantId) {
        userSubmissions.push(submissionData[i][2]); // Challenge number
      }
    }

    const completed = new Set(userSubmissions).size;

    return {
      participantId: participant.participantId,
      firstName: participant.firstName,
      lastName: participant.lastName,
      completed: completed,
      totalWIS: 0, // Will be calculated when ground truth is available
      avgWIS: 0
    };
  })
  .filter(p => p.completed === 3) // Only show participants who completed all 3 challenges
  .sort((a, b) => b.completed - a.completed); // Sort by completed (desc)

  // Add rank
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return {
    success: true,
    leaderboard: leaderboard
  };
}

function getParticipant(ss, participantId) {
  const participantsSheet = ss.getSheetByName('Participants');
  const submissionsSheet = ss.getSheetByName('Submissions');

  // Get participant info
  const participantData = participantsSheet.getDataRange().getValues();
  let participant = null;
  for (let i = 1; i < participantData.length; i++) {
    if (participantData[i][0] === participantId) {
      participant = {
        participantId: participantData[i][0],
        firstName: participantData[i][1],
        lastName: participantData[i][2]
      };
      break;
    }
  }

  if (!participant) {
    return {
      success: false,
      error: 'Participant not found'
    };
  }

  // Get submissions
  const submissionData = submissionsSheet.getDataRange().getValues();
  const submissions = [];
  for (let i = 1; i < submissionData.length; i++) {
    if (submissionData[i][1] === participantId) {
      submissions.push({
        challengeNum: submissionData[i][2],
        median: submissionData[i][3],
        q25: submissionData[i][4],
        q75: submissionData[i][5],
        q025: submissionData[i][6],
        q975: submissionData[i][7],
        submittedAt: submissionData[i][8]
      });
    }
  }

  return {
    success: true,
    participant: participant,
    submissions: submissions
  };
}
```

---

## Configuration in React App

After deploying the Apps Script, add the Web App URL to your React config:

```javascript
// /app/src/config/tournament.js
export const TOURNAMENT_CONFIG = {
  apiUrl: 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
  sheetId: '17J5KWUrVuqmqqBcVJg2A-dfVdrL4LjXTvlztCDpS0g0',
  // ... rest of config
};
```

---

## Testing

1. Test registration: `POST {apiUrl}?action=register` with `{firstName: 'Alice', lastName: 'Smith'}`
2. Test submission: `POST {apiUrl}?action=submitForecast` with forecast data
3. Test leaderboard: `GET {apiUrl}?action=getLeaderboard`
